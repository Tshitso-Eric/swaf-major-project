#helper function for hashing and verification
import bcrypt

def hash_password(password: str) -> str:
    """
    Hashes a plain password using bcrypt.
    Returns the hashed string (ready to store in DB).
    """
    salt = bcrypt.gensalt(rounds=12)  # 12 is a good balance of security vs speed
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if the provided plain password matches the stored hash.
    """
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )