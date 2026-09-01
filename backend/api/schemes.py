from fastapi import APIRouter
from db.mongo import get_collection

router = APIRouter()

SEED_SCHEMES = [
    {"scheme_id": "pm_kisan", "name": "PM-KISAN", "description": "Income support for farmers", "eligibility": ["Small and marginal farmers with cultivable land"], "benefits": "₹6,000 per year in 3 instalments", "apply_url": "https://pmkisan.gov.in", "target_groups": ["farmer"], "category": "agriculture"},
    {"scheme_id": "pm_mudra", "name": "PM Mudra Yojana", "description": "Loans for small businesses and self-employed", "eligibility": ["Non-farm income generating activities", "Loan up to ₹10 lakh"], "benefits": "Collateral-free loans: Shishu (₹50k), Kishor (₹5L), Tarun (₹10L)", "apply_url": "https://mudra.org.in", "target_groups": ["business_owner", "gig_worker"], "category": "credit"},
    {"scheme_id": "pm_jay", "name": "PM-JAY Ayushman Bharat", "description": "Health insurance for low-income families", "eligibility": ["SECC 2011 listed families"], "benefits": "₹5 lakh health cover per family per year", "apply_url": "https://pmjay.gov.in", "target_groups": ["farmer", "gig_worker", "homemaker"], "category": "insurance"},
    {"scheme_id": "pm_ujjwala", "name": "PM Ujjwala Yojana", "description": "Free LPG connections for women from BPL households", "eligibility": ["Women from BPL families", "No existing LPG connection"], "benefits": "Free LPG cylinder and connection", "apply_url": "https://pmuy.gov.in", "target_groups": ["homemaker"], "category": "energy"},
    {"scheme_id": "sukanya", "name": "Sukanya Samriddhi Yojana", "description": "Savings scheme for girl child education and marriage", "eligibility": ["Girl child below 10 years", "Opened by guardian"], "benefits": "High interest rate (~8.2%), tax benefits under 80C", "apply_url": "https://www.indiapost.gov.in", "target_groups": ["homemaker", "salaried", "farmer"], "category": "education"},
    {"scheme_id": "pm_edrive", "name": "PM E-Drive Scheme", "description": "Subsidy on electric two-wheelers and three-wheelers", "eligibility": ["Indian citizens purchasing eligible EVs"], "benefits": "₹10,000 subsidy on e-2W, ₹50,000 on e-3W", "apply_url": "https://heavyindustries.gov.in", "target_groups": ["gig_worker"], "category": "transport"},
    {"scheme_id": "svanidhi", "name": "PM SVANidhi", "description": "Working capital loans for street vendors", "eligibility": ["Street vendors with vending certificate or letter of recommendation"], "benefits": "₹10,000 → ₹20,000 → ₹50,000 collateral-free loans", "apply_url": "https://pmsvanidhi.mohua.gov.in", "target_groups": ["gig_worker", "business_owner"], "category": "credit"},
]

@router.get("/schemes/seed")
async def seed_schemes():
    col = get_collection("schemes")
    for s in SEED_SCHEMES:
        col.update_one({"scheme_id": s["scheme_id"]}, {"$set": s}, upsert=True)
    return {"seeded": len(SEED_SCHEMES)}

@router.get("/schemes")
async def get_schemes(occupation: str = None):
    col = get_collection("schemes")
    query = {}
    if occupation:
        query["target_groups"] = {"$in": [occupation]}
    docs = list(col.find(query, {"_id": 0}))
    return docs