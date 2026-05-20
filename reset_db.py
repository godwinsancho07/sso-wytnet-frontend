import os
import sys

sys.path.append(r"c:\Users\Ayisha\Music\WYtSaaas")

from app.db.database import SessionLocal
from app.models.subscription import Subscription
from app.models.marketplace_wallet import MarketplaceDeveloperWallet

db = SessionLocal()
try:
    subs = db.query(Subscription).all()
    for s in subs:
        s.settled = False
    
    wallets = db.query(MarketplaceDeveloperWallet).all()
    for w in wallets:
        w.total_earned = 0.0
        w.pending_payout = 0.0
        w.total_withdrawn = 0.0

    db.commit()
    print("Successfully reset subscription settlements and developer wallets in Supabase Postgres DB!")
except Exception as e:
    print("Error during DB reset:", e)
finally:
    db.close()
