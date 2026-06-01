import joblib
import pandas as pd
import numpy as np
import os
import re
from datetime import datetime

class HybridMLEngine:
    def __init__(self):
        # Paths relative to this file's location for better reliability
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.xgboost_path = os.path.join(base_dir, 'xgboost', 'xgboost_pipeline.pkl')
        self.autoencoder_path = os.path.join(base_dir, 'autoencoders', 'autoencoder_pipeline.pkl')
        
        self.xgb_model = None
        self.ae_model = None
        self.is_ready = False
        self.load_models()

    def load_models(self):
        """Load models with resource awareness"""
        try:
            if os.path.exists(self.xgboost_path):
                self.xgb_model = joblib.load(self.xgboost_path)
                print("✅ XGBoost Pipeline loaded")
            
            if os.path.exists(self.autoencoder_path):
                self.ae_model = joblib.load(self.autoencoder_path)
                print("✅ Autoencoder Model loaded")
            
            if self.xgb_model:
                self.is_ready = True
        except Exception as e:
            print(f"❌ Error loading models: {e}")

    def _prepare_features(self, request_data):
        body = request_data.get('body', '') or ''
        url = request_data.get('url', '') or ''
        method = request_data.get('method', 'GET')
        
        payload = (url + " " + body).lower()
        
        is_suspicious = 0
        
        # 1. SQLi Markers
        sqli_keywords = [
            "' or", "--", "select ", "union ", "insert ", "update ", "delete ", 
            "drop ", "waitfor ", "delay ", "sleep(", "pg_sleep", "benchmark(",
            "information_schema", "sysobjects", "into outfile", "load_file"
        ]
        if any(p in payload for p in sqli_keywords):
            is_suspicious = 1
        
        # 2. XSS & CSRF Markers
        xss_csrf_markers = [
            "<script", "alert(", "onerror", "onload", "eval(", "src=", 
            "prompt(", "confirm(", "document.cookie", "document.location",
            "document.forms", ".submit()", "xmlhttprequest", "fetch(", "axios"
        ]
        if any(p in payload for p in xss_csrf_markers):
            is_suspicious = 1
            
        # 3. Path Traversal Markers
        if any(p in payload for p in ["../", "..\\", "etc/passwd", "config.php", "system32", "/var/www"]):
            is_suspicious = 1

        # 4. Command Injection Markers (Use regex for word boundaries to avoid false positives like 'hello')
        if any(re.search(rf"\b{re.escape(p)}\b", payload) for p in [";", "|", "&", "whoami", "cat", "ls", "sh", "bash"]):
             is_suspicious = 1
        if any(p in payload for p in ["$(", "`"]): # Symbols don't need word boundaries
             is_suspicious = 1

        # 5. Remote File Inclusion / Protocol markers (Only if in body or as a query param value)
        query_part = url.split('?', 1)[1] if '?' in url else ''
        if any(p in (body.lower() + " " + query_part.lower()) for p in ["http://", "https://", "ftp://", "php://"]):
            is_suspicious = 1

        sbytes = len(body) + len(url)
        
        # Mapping to UNSW-NB15 based on data analysis
        features = {
            'dur': 0.1,
            'proto': 'tcp',
            'service': 'http',
            'state': 'CON',
            'spkts': 10 if is_suspicious else 2,
            'dpkts': 0,
            'sbytes': sbytes,
            'dbytes': 0,
            'rate': 200000.0 if is_suspicious else 10000.0,
            'sttl': 252 if is_suspicious else 62,
            'dttl': 252 if is_suspicious else 0,
            'sload': 100000.0 if is_suspicious else 1000.0,
            'dload': 0.0,
            'sloss': 1 if sbytes > 1000 else 0,
            'dloss': 0,
            'sinpkt': 0.1,
            'dinpkt': 0.0,
            'sjit': 0.0,
            'djit': 0.0,
            'swin': 255,
            'stcpb': 0,
            'dtcpb': 0,
            'dwin': 0,
            'tcprtt': 0.0,
            'synack': 0.0,
            'ackdat': 0.0,
            'smean': sbytes / 2 if sbytes > 0 else 0,
            'dmean': 0,
            'trans_depth': 1 if is_suspicious else 0,
            'response_body_len': 0,
            'ct_srv_src': 2 if is_suspicious else 1,
            'ct_state_ttl': 2 if is_suspicious else 0,
            'ct_dst_ltm': 1,
            'ct_src_dport_ltm': 1,
            'ct_dst_sport_ltm': 1,
            'ct_dst_src_ltm': 1,
            'is_ftp_login': 0,
            'ct_ftp_cmd': 0,
            'ct_flw_http_mthd': 1 if method == 'POST' else 0,
            'ct_src_ltm': 1,
            'ct_srv_dst': 1,
            'is_sm_ips_ports': 0
        }
        
        return pd.DataFrame([features])

    def predict(self, request_data):
        if not self.is_ready:
            return "ALLOW", 0.0, None

        body = request_data.get('body', '') or ''
        url = request_data.get('url', '') or ''
        payload = (url + " " + body).lower()
        
        # Expanded risk markers for threshold tuning
        risk_markers = [
            "<script", "alert(", "' or", "--", "../", "etc/passwd", "select ", 
            "union ", ";", "|", "$(", "`", "onload", "onerror", "document.", 
            "waitfor ", "sleep(", "information_schema"
        ]
        is_suspicious = any(m in payload for m in risk_markers)
        
        X = self._prepare_features(request_data)
        
        # 1. XGBoost
        try:
            xgb_prob = self.xgb_model.predict_proba(X)[0][1]
            
            # Step 11: Dynamic threshold
            # If we see suspicious markers, we use a more sensitive threshold (0.3)
            # Otherwise, use standard 0.5 to keep false positives low.
            threshold = 0.3 if is_suspicious else 0.6
            
            if xgb_prob > threshold:
                return "BLOCK", float(xgb_prob), "XGBoost_Attack"
        except Exception as e:
            print(f"XGBoost Prediction Error: {e}")
            xgb_prob = 0.0

        # 2. Autoencoder
        if self.ae_model and (len(body) > 1000 or is_suspicious):
            try:
                if hasattr(self.ae_model, 'named_steps'):
                    preprocessor = self.ae_model.named_steps['preprocessor']
                    autoencoder = self.ae_model.named_steps['autoencoder']
                    X_trans = preprocessor.transform(X)
                    X_recon = autoencoder.predict(X_trans)
                    mse = np.mean(np.power(X_trans - X_recon, 2))
                else:
                    X_recon = self.ae_model.predict(X)
                    mse = np.mean(np.power(X - X_recon, 2))
                    
                if mse > 5.0:
                    return "BLOCK", float(mse), "Autoencoder_Anomaly"
            except: pass

        return "ALLOW", float(xgb_prob), None

    def get_info(self):
        info = {}
        
        # Helper to get file modification time
        def get_mod_time(path):
            if os.path.exists(path):
                mtime = os.path.getmtime(path)
                return datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
            return "N/A"

        info['xgboost'] = {
            'status': 'Active' if self.xgb_model else 'Not Found', 
            'type': 'Supervised',
            'last_trained': get_mod_time(self.xgboost_path)
        }
        info['autoencoder'] = {
            'status': 'Active' if self.ae_model else 'Disabled/Not Found', 
            'type': 'Unsupervised',
            'last_trained': get_mod_time(self.autoencoder_path)
        }
        return info
