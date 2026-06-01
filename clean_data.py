import pandas as pd
import numpy as np

# Define file paths
file_path = 'Back-End/data/public_datasets/UNSW-NB15_1.csv'
output_path = 'Back-End/data/public_datasets/UNSW-NB15_1_cleaned.csv'

# Full list of 49 columns for UNSW-NB15
all_columns = [
    'srcip', 'sport', 'dstip', 'dsport', 'proto', 'state', 'dur', 'sbytes', 'dbytes', 'sttl', 'dttl', 
    'sloss', 'dloss', 'service', 'Sload', 'Dload', 'Spkts', 'Dpkts', 'swin', 'dwin', 'stcpb', 'dtcpb', 
    'smeansz', 'dmeansz', 'trans_depth', 'res_bdy_len', 'Sjit', 'Djit', 'Stime', 'Ltime', 'Sintpkt', 
    'Dintpkt', 'tcprtt', 'synack', 'ackdat', 'is_sm_ips_ports', 'ct_state_ttl', 'ct_flw_http_mthd', 
    'is_ftp_login', 'ct_ftp_cmd', 'ct_srv_src', 'ct_srv_dst', 'ct_dst_ltm', 'ct_src_ltm', 
    'ct_src_dport_ltm', 'ct_dst_sport_ltm', 'ct_dst_src_ltm', 'attack_cat', 'Label'
]

# Read the dataset
df = pd.read_csv(file_path, names=all_columns, low_memory=False)

# 1. Drop Labels for Unsupervised Learning
# For Autoencoders, we only need the features.
df = df.drop(columns=['attack_cat', 'Label'])

# 2. Data Cleaning
# Standardize 'service' column (replace '-' with 'other')
df['service'] = df['service'].replace('-', 'other')

# Handle whitespace in categorical columns
cat_cols = ['srcip', 'sport', 'dstip', 'dsport', 'proto', 'state', 'service']
for col in cat_cols:
    if col in df.columns:
        df[col] = df[col].astype(str).str.strip()

# Remove duplicates
df = df.drop_duplicates()

# 3. Data Statistics (Unlabeled)
print("### Data Statistics (Cleaned for Unsupervised Learning) ###")
print(f"Shape (Features Only): {df.shape}")

print("\n### Summary Statistics (Top 5 Numeric Features) ###")
numeric_cols = df.select_dtypes(include=[np.number]).columns[:5]
print(df[numeric_cols].describe())

print("\n### Missing Values Check ###")
print(df.isnull().sum().sum())

# Save cleaned data
df.to_csv(output_path, index=False)
print(f"\nCleaned unlabeled data saved to: {output_path}")
