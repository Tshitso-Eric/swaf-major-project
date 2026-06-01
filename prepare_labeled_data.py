import pandas as pd
import numpy as np

file_path = 'Back-End/data/public_datasets/UNSW-NB15_1.csv'
labeled_output = 'Back-End/data/public_datasets/UNSW-NB15_1_labeled.csv'

columns = [
    'srcip', 'sport', 'dstip', 'dsport', 'proto', 'state', 'dur', 'sbytes', 'dbytes', 'sttl', 'dttl', 
    'sloss', 'dloss', 'service', 'Sload', 'Dload', 'Spkts', 'Dpkts', 'swin', 'dwin', 'stcpb', 'dtcpb', 
    'smeansz', 'dmeansz', 'trans_depth', 'res_bdy_len', 'Sjit', 'Djit', 'Stime', 'Ltime', 'Sintpkt', 
    'Dintpkt', 'tcprtt', 'synack', 'ackdat', 'is_sm_ips_ports', 'ct_state_ttl', 'ct_flw_http_mthd', 
    'is_ftp_login', 'ct_ftp_cmd', 'ct_srv_src', 'ct_srv_dst', 'ct_dst_ltm', 'ct_src_ltm', 
    'ct_src_dport_ltm', 'ct_dst_sport_ltm', 'ct_dst_src_ltm', 'attack_cat', 'Label'
]

df = pd.read_csv(file_path, names=columns, low_memory=False)

# Cleaning
df['attack_cat'] = df['attack_cat'].fillna('Normal').str.strip()
df['service'] = df['service'].replace('-', 'other')
cat_cols = ['srcip', 'sport', 'dstip', 'dsport', 'proto', 'state', 'service']
for col in cat_cols:
    df[col] = df[col].astype(str).str.strip()

# Labels
df['Label'] = pd.to_numeric(df['Label'], errors='coerce').fillna(0).astype(int)
df = df.drop_duplicates()

# Save labeled dataset
df.to_csv(labeled_output, index=False)
print(f"Labeled dataset saved to: {labeled_output}")
