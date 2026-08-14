from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


# ----------------------------- Models -----------------------------

class Audience(BaseModel):
    all: bool = True
    departments: List[str] = []
    locations: List[str] = []
    titles: List[str] = []
    seniorities: List[str] = []


class CategoryCreate(BaseModel):
    category_type: str = "duyuru"
    display_name: str
    icon: str = "Megaphone"           # lucide icon name
    icon_image: Optional[str] = None  # base64/url custom image
    status: str = "active"            # active | passive
    audience: Audience = Field(default_factory=Audience)
    reporting_levels: List[str] = ["kisi"]   # kisi | organizasyon | sirket
    content_type: str = "pasif"       # eylem | pasif
    pinnable: bool = True


class CategoryUpdate(BaseModel):
    display_name: Optional[str] = None
    icon: Optional[str] = None
    icon_image: Optional[str] = None
    status: Optional[str] = None
    audience: Optional[Audience] = None
    reporting_levels: Optional[List[str]] = None
    content_type: Optional[str] = None
    pinnable: Optional[bool] = None


class ReorderPayload(BaseModel):
    ordered_ids: List[str]


class SubCategoryCreate(BaseModel):
    category_id: str
    name: str
    icon: str = "FileText"
    audience: Optional[Audience] = None  # None => inherit from parent


class SubCategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    audience: Optional[Audience] = None


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    image: Optional[str] = None       # base64/url
    subcategory_id: str
    audience: Audience = Field(default_factory=Audience)
    channels: List[str] = []          # mail | push | sms
    status: str = "onay_bekliyor"     # taslak | onay_bekliyor | yayinda | pasif


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    image: Optional[str] = None
    subcategory_id: Optional[str] = None
    audience: Optional[Audience] = None
    channels: Optional[List[str]] = None
    status: Optional[str] = None


class PulseQuestion(BaseModel):
    id: str = Field(default_factory=new_id)
    text: str
    type: str = "skor"          # skor | tek_secim
    options: List[str] = []     # for tek_secim
    allow_comment: bool = False


class PulseCreate(BaseModel):
    title: str
    icon: str = "Activity"
    audience: Audience = Field(default_factory=Audience)
    status: str = "active"      # active | passive
    questions: List[PulseQuestion] = []
    mandatory: bool = False
    anonymous: bool = False
    frequency: str = "haftalik" # haftalik | aylik
    start_date: Optional[str] = None


class PulseUpdate(BaseModel):
    title: Optional[str] = None
    icon: Optional[str] = None
    audience: Optional[Audience] = None
    status: Optional[str] = None
    questions: Optional[List[PulseQuestion]] = None
    mandatory: Optional[bool] = None
    anonymous: Optional[bool] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None


class PulseAnswer(BaseModel):
    question_id: str
    score: Optional[int] = None
    choice: Optional[str] = None
    comment: Optional[str] = None


class PulseResponseCreate(BaseModel):
    employee_id: str
    answers: List[PulseAnswer] = []


# ----------------------------- Static / Seed data -----------------------------

CATEGORY_TYPES = [
    {"key": "duyuru", "label": "Duyuru", "active": True},
    {"key": "pulse", "label": "Pulse Anketi", "active": True},
    {"key": "etkinlik", "label": "Etkinlik", "active": False},
    {"key": "anket", "label": "Anket", "active": False},
    {"key": "kudos", "label": "Kudos / Takdir", "active": False},
    {"key": "oyunlastirma", "label": "Oyunlaştırma", "active": False},
    {"key": "ilan", "label": "İç İlan", "active": False},
    {"key": "rozet", "label": "Rozet", "active": False},
]

SEGMENT_OPTIONS = {
    "departments": ["Mühendislik", "İnsan Kaynakları", "Satış", "Pazarlama"],
    "locations": ["İstanbul", "Ankara", "İzmir"],
    "titles": ["Uzman", "Kıdemli Uzman", "Yönetici", "Direktör"],
    "seniorities": ["0-1 yıl", "1-3 yıl", "3-5 yıl", "5+ yıl"],
}

SEED_EMPLOYEES = [
    {"name": "Selin Tekin", "department": "İnsan Kaynakları", "location": "İstanbul", "title": "Yönetici", "seniority": "5+ yıl", "role": "admin"},
    {"name": "Almina Aksucu", "department": "İnsan Kaynakları", "location": "İstanbul", "title": "Uzman", "seniority": "1-3 yıl", "role": "admin"},
    {"name": "Erol Taş", "department": "Satış", "location": "Ankara", "title": "Uzman", "seniority": "3-5 yıl", "role": "employee"},
    {"name": "Esra Bircan", "department": "İnsan Kaynakları", "location": "İstanbul", "title": "Kıdemli Uzman", "seniority": "3-5 yıl", "role": "employee"},
    {"name": "Mert Yılmaz", "department": "Mühendislik", "location": "İzmir", "title": "Kıdemli Uzman", "seniority": "5+ yıl", "role": "employee"},
    {"name": "Deniz Kaya", "department": "Mühendislik", "location": "İstanbul", "title": "Uzman", "seniority": "0-1 yıl", "role": "employee"},
    {"name": "Buse Demir", "department": "Pazarlama", "location": "Ankara", "title": "Uzman", "seniority": "1-3 yıl", "role": "employee"},
    {"name": "Can Öztürk", "department": "Satış", "location": "İzmir", "title": "Direktör", "seniority": "5+ yıl", "role": "employee"},
]


async def seed_if_empty():
    if await db.employees.count_documents({}) == 0:
        for e in SEED_EMPLOYEES:
            await db.employees.insert_one({"id": new_id(), **e})

    if await db.categories.count_documents({}) == 0:
        cat_id = new_id()
        await db.categories.insert_one({
            "id": cat_id,
            "category_type": "duyuru",
            "display_name": "Duyurular",
            "icon": "Megaphone",
            "icon_image": None,
            "status": "active",
            "audience": Audience().model_dump(),
            "reporting_levels": ["kisi", "sirket"],
            "content_type": "pasif",
            "pinnable": True,
            "order": 0,
            "created_at": now_iso(),
        })
        subs = [
            {"name": "Şirket Haberleri", "icon": "Newspaper"},
            {"name": "Doğum Haberleri", "icon": "Cake"},
            {"name": "İK Duyuruları", "icon": "Users"},
        ]
        sub_ids = []
        for s in subs:
            sid = new_id()
            sub_ids.append(sid)
            await db.subcategories.insert_one({
                "id": sid, "category_id": cat_id, "name": s["name"],
                "icon": s["icon"], "audience": None, "created_at": now_iso(),
            })

        samples = [
            {"title": "2026 Yılı Şirket Hedefleri Açıklandı", "body": "Değerli çalışma arkadaşlarımız, yeni yıl için belirlediğimiz büyüme hedeflerini ve stratejik önceliklerimizi sizlerle paylaşmaktan mutluluk duyuyoruz. Detaylar için tüm ekiplerle toplantılar planlanacaktır.", "subcategory_id": sub_ids[0], "status": "yayinda", "pinned": True},
            {"title": "Yeni Ofisimiz İstanbul'da Açıldı", "body": "Büyüyen ekibimiz için Maslak'ta yeni ofisimizi hizmete açtık. Açılış etkinliğine tüm çalışanlarımız davetlidir.", "subcategory_id": sub_ids[0], "status": "yayinda", "pinned": False},
            {"title": "Esra Bircan'a Hoş Geldin!", "body": "İnsan Kaynakları ekibimize katılan Esra Bircan'a aramıza hoş geldin diyoruz.", "subcategory_id": sub_ids[1], "status": "yayinda", "pinned": False},
            {"title": "Yıllık İzin Süreçlerinde Güncelleme", "body": "İzin talep süreçlerimiz dijitalleşti. Yeni sistem üzerinden taleplerinizi kolayca oluşturabilirsiniz.", "subcategory_id": sub_ids[2], "status": "onay_bekliyor", "pinned": False},
        ]
        for sm in samples:
            await db.announcements.insert_one({
                "id": new_id(),
                "title": sm["title"], "body": sm["body"], "image": None,
                "subcategory_id": sm["subcategory_id"],
                "audience": Audience().model_dump(),
                "channels": ["mail", "push"],
                "status": sm["status"], "pinned": sm["pinned"],
                "created_at": now_iso(), "updated_at": now_iso(),
            })


# ----------------------------- Helpers -----------------------------

def clean(doc):
    doc.pop("_id", None)
    return doc


def employee_matches(emp: dict, audience: dict) -> bool:
    if not audience or audience.get("all"):
        return True
    checks = [
        ("departments", "department"),
        ("locations", "location"),
        ("titles", "title"),
        ("seniorities", "seniority"),
    ]
    any_filter = False
    for aud_key, emp_key in checks:
        vals = audience.get(aud_key) or []
        if vals:
            any_filter = True
            if emp.get(emp_key) in vals:
                return True
    # if no filters selected at all, treat as everyone
    return not any_filter


# ----------------------------- Routes -----------------------------

@api_router.get("/")
async def root():
    return {"message": "Plena İç İletişim API"}


@api_router.get("/employees")
async def get_employees():
    items = await db.employees.find({}, {"_id": 0}).to_list(1000)
    return items


@api_router.get("/segments/options")
async def get_segment_options():
    return SEGMENT_OPTIONS


@api_router.get("/category-types")
async def get_category_types():
    return CATEGORY_TYPES


# ---- Categories ----
@api_router.get("/categories")
async def list_categories():
    items = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return items


@api_router.post("/categories")
async def create_category(payload: CategoryCreate):
    count = await db.categories.count_documents({})
    doc = {"id": new_id(), **payload.model_dump(), "order": count, "created_at": now_iso()}
    await db.categories.insert_one(doc)
    return clean(doc)


@api_router.put("/categories/{cat_id}")
async def update_category(cat_id: str, payload: CategoryUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, "Güncellenecek alan yok")
    res = await db.categories.update_one({"id": cat_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Kategori bulunamadı")
    doc = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    return doc


@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str):
    await db.categories.delete_one({"id": cat_id})
    await db.subcategories.delete_many({"category_id": cat_id})
    return {"ok": True}


@api_router.post("/categories/reorder")
async def reorder_categories(payload: ReorderPayload):
    for idx, cid in enumerate(payload.ordered_ids):
        await db.categories.update_one({"id": cid}, {"$set": {"order": idx}})
    items = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return items


# ---- Subcategories ----
@api_router.get("/subcategories")
async def list_subcategories(category_id: Optional[str] = None):
    q = {"category_id": category_id} if category_id else {}
    items = await db.subcategories.find(q, {"_id": 0}).to_list(1000)
    return items


@api_router.post("/subcategories")
async def create_subcategory(payload: SubCategoryCreate):
    doc = {
        "id": new_id(), "category_id": payload.category_id, "name": payload.name,
        "icon": payload.icon,
        "audience": payload.audience.model_dump() if payload.audience else None,
        "created_at": now_iso(),
    }
    await db.subcategories.insert_one(doc)
    return clean(doc)


@api_router.put("/subcategories/{sub_id}")
async def update_subcategory(sub_id: str, payload: SubCategoryUpdate):
    update = {}
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        update["name"] = data["name"]
    if "icon" in data and data["icon"] is not None:
        update["icon"] = data["icon"]
    if "audience" in data:
        update["audience"] = payload.audience.model_dump() if payload.audience else None
    res = await db.subcategories.update_one({"id": sub_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Alt kategori bulunamadı")
    doc = await db.subcategories.find_one({"id": sub_id}, {"_id": 0})
    return doc


@api_router.delete("/subcategories/{sub_id}")
async def delete_subcategory(sub_id: str):
    await db.subcategories.delete_one({"id": sub_id})
    return {"ok": True}


# ---- Announcements ----
@api_router.get("/announcements")
async def list_announcements(status: Optional[str] = None, subcategory_id: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    if subcategory_id:
        q["subcategory_id"] = subcategory_id
    items = await db.announcements.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api_router.get("/announcements/feed")
async def announcements_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    subs = {s["id"]: s for s in await db.subcategories.find({}, {"_id": 0}).to_list(1000)}
    cats = {c["id"]: c for c in await db.categories.find({}, {"_id": 0}).to_list(1000)}
    published = await db.announcements.find({"status": "yayinda"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for a in published:
        sub = subs.get(a["subcategory_id"])
        if not sub:
            continue
        cat = cats.get(sub["category_id"])
        if not cat or cat.get("status") != "active":
            continue
        # audience: announcement -> else subcategory -> else category
        aud = a.get("audience") or sub.get("audience") or (cat.get("audience") if cat else None)
        if employee_matches(emp, aud):
            a["_subcategory"] = sub
            result.append(a)
    return result


@api_router.get("/announcements/{ann_id}")
async def get_announcement(ann_id: str):
    doc = await db.announcements.find_one({"id": ann_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Duyuru bulunamadı")
    sub = await db.subcategories.find_one({"id": doc["subcategory_id"]}, {"_id": 0})
    doc["_subcategory"] = sub
    return doc


@api_router.post("/announcements")
async def create_announcement(payload: AnnouncementCreate):
    doc = {
        "id": new_id(), **payload.model_dump(),
        "pinned": False, "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.announcements.insert_one(doc)
    return clean(doc)


@api_router.put("/announcements/{ann_id}")
async def update_announcement(ann_id: str, payload: AnnouncementUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    update["updated_at"] = now_iso()
    res = await db.announcements.update_one({"id": ann_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Duyuru bulunamadı")
    return await db.announcements.find_one({"id": ann_id}, {"_id": 0})


@api_router.post("/announcements/{ann_id}/approve")
async def approve_announcement(ann_id: str):
    res = await db.announcements.update_one({"id": ann_id}, {"$set": {"status": "yayinda", "updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Duyuru bulunamadı")
    return await db.announcements.find_one({"id": ann_id}, {"_id": 0})


@api_router.post("/announcements/{ann_id}/reject")
async def reject_announcement(ann_id: str):
    res = await db.announcements.update_one({"id": ann_id}, {"$set": {"status": "pasif", "updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Duyuru bulunamadı")
    return await db.announcements.find_one({"id": ann_id}, {"_id": 0})


@api_router.post("/announcements/{ann_id}/pin")
async def pin_announcement(ann_id: str):
    doc = await db.announcements.find_one({"id": ann_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Duyuru bulunamadı")
    new_val = not doc.get("pinned", False)
    await db.announcements.update_one({"id": ann_id}, {"$set": {"pinned": new_val, "updated_at": now_iso()}})
    return await db.announcements.find_one({"id": ann_id}, {"_id": 0})


@api_router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str):
    await db.announcements.delete_one({"id": ann_id})
    return {"ok": True}


def _mean(vals):
    return round(sum(vals) / len(vals), 2) if vals else 0


async def seed_pulses_if_empty():
    if await db.categories.count_documents({"category_type": "pulse"}) > 0:
        return
    import random
    pcount = await db.categories.count_documents({})
    pcat_id = new_id()
    await db.categories.insert_one({
        "id": pcat_id, "category_type": "pulse", "display_name": "Pulse Anketi",
        "icon": "Activity", "icon_image": None, "status": "active",
        "audience": Audience().model_dump(),
        "reporting_levels": ["kisi", "organizasyon", "sirket"],
        "content_type": "eylem", "pinnable": False,
        "order": pcount, "created_at": now_iso(),
    })
    q1 = {"id": new_id(), "text": "Bu hafta kendini işte ne kadar enerjik hissettin?", "type": "skor", "options": [], "allow_comment": True}
    q2 = {"id": new_id(), "text": "Yöneticinden aldığın destekten memnun musun?", "type": "skor", "options": [], "allow_comment": False}
    q3 = {"id": new_id(), "text": "Bu hafta ağırlıklı çalışma modelin neydi?", "type": "tek_secim", "options": ["Ofiste", "Hibrit", "Uzaktan"], "allow_comment": False}
    pulse_id = new_id()
    await db.pulses.insert_one({
        "id": pulse_id, "category_id": pcat_id, "title": "Haftalık Nabız Anketi",
        "icon": "Activity", "audience": Audience().model_dump(), "status": "active",
        "questions": [q1, q2, q3], "mandatory": True, "anonymous": False,
        "frequency": "haftalik", "start_date": "2026-08-01", "created_at": now_iso(),
    })
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    responders = emps[3:8]
    comments = ["Genel olarak verimli bir haftaydı.", "Biraz yoğundu ama iyiydi.", "Destek konusunda gelişim olabilir."]
    for d in ["2026-07-28", "2026-08-04"]:
        for ci, emp in enumerate(responders):
            await db.pulse_responses.insert_one({
                "id": new_id(), "pulse_id": pulse_id, "employee_id": emp["id"],
                "answers": [
                    {"question_id": q1["id"], "score": random.randint(3, 5), "choice": None, "comment": comments[ci % len(comments)] if ci < 3 else None},
                    {"question_id": q2["id"], "score": random.randint(2, 5), "choice": None, "comment": None},
                    {"question_id": q3["id"], "score": None, "choice": random.choice(["Ofiste", "Hibrit", "Uzaktan"]), "comment": None},
                ],
                "created_at": d + "T09:00:00+00:00",
            })


@api_router.get("/pulses")
async def list_pulses():
    items = await db.pulses.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    for p in items:
        resp = await db.pulse_responses.find({"pulse_id": p["id"]}, {"_id": 0}).to_list(100000)
        responders = set(r["employee_id"] for r in resp)
        target = [e for e in emps if employee_matches(e, p.get("audience"))]
        p["target_count"] = len(target)
        p["response_count"] = len(responders)
        p["response_rate"] = round(100 * len(responders) / len(target)) if target else 0
    return items


@api_router.post("/pulses")
async def create_pulse(payload: PulseCreate):
    if not (1 <= len(payload.questions) <= 5):
        raise HTTPException(400, "Bir pulse 1 ile 5 arası soru içermelidir.")
    cat = await db.categories.find_one({"category_type": "pulse"}, {"_id": 0})
    doc = {"id": new_id(), "category_id": cat["id"] if cat else None, **payload.model_dump(), "created_at": now_iso()}
    await db.pulses.insert_one(doc)
    return clean(doc)


@api_router.get("/pulses/feed")
async def pulses_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    active = await db.pulses.find({"status": "active"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for p in active:
        if employee_matches(emp, p.get("audience")):
            filled = await db.pulse_responses.count_documents({"pulse_id": p["id"], "employee_id": employee_id}) > 0
            p["filled"] = filled
            result.append(p)
    return result


@api_router.get("/pulses/{pid}")
async def get_pulse(pid: str):
    doc = await db.pulses.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Pulse bulunamadı")
    return doc


@api_router.put("/pulses/{pid}")
async def update_pulse(pid: str, payload: PulseUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "questions" in update and not (1 <= len(update["questions"]) <= 5):
        raise HTTPException(400, "Bir pulse 1 ile 5 arası soru içermelidir.")
    res = await db.pulses.update_one({"id": pid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Pulse bulunamadı")
    return await db.pulses.find_one({"id": pid}, {"_id": 0})


@api_router.delete("/pulses/{pid}")
async def delete_pulse(pid: str):
    await db.pulses.delete_one({"id": pid})
    await db.pulse_responses.delete_many({"pulse_id": pid})
    return {"ok": True}


@api_router.post("/pulses/{pid}/respond")
async def respond_pulse(pid: str, payload: PulseResponseCreate):
    pulse = await db.pulses.find_one({"id": pid}, {"_id": 0})
    if not pulse:
        raise HTTPException(404, "Pulse bulunamadı")
    doc = {
        "id": new_id(), "pulse_id": pid, "employee_id": payload.employee_id,
        "answers": [a.model_dump() for a in payload.answers], "created_at": now_iso(),
    }
    await db.pulse_responses.insert_one(doc)
    return {"ok": True}


@api_router.get("/pulses/{pid}/report")
async def pulse_report(pid: str):
    pulse = await db.pulses.find_one({"id": pid}, {"_id": 0})
    if not pulse:
        raise HTTPException(404, "Pulse bulunamadı")
    anonymous = pulse.get("anonymous", False)
    responses = await db.pulse_responses.find({"pulse_id": pid}, {"_id": 0}).sort("created_at", 1).to_list(100000)
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    target = [e for e in emps.values() if employee_matches(e, pulse.get("audience"))]
    responders = set(r["employee_id"] for r in responses)

    questions_out = []
    all_skor_by_date = {}
    dept_scores = {}
    for q in pulse["questions"]:
        qid = q["id"]
        if q["type"] == "skor":
            by_date = {}
            comments = []
            all_scores = []
            for r in responses:
                for a in r["answers"]:
                    if a["question_id"] != qid:
                        continue
                    if a.get("score") is not None:
                        day = r["created_at"][:10]
                        by_date.setdefault(day, []).append(a["score"])
                        all_scores.append(a["score"])
                        all_skor_by_date.setdefault(day, []).append(a["score"])
                        emp = emps.get(r["employee_id"])
                        if emp:
                            dept_scores.setdefault(emp["department"], []).append(a["score"])
                    if a.get("comment"):
                        comments.append({"name": "Anonim" if anonymous else emps.get(r["employee_id"], {}).get("name", "—"), "text": a["comment"]})
            trend = [{"date": d, "avg": _mean(by_date[d]), "count": len(by_date[d])} for d in sorted(by_date)]
            questions_out.append({"id": qid, "text": q["text"], "type": "skor", "trend": trend, "overall_avg": _mean(all_scores), "comments": comments})
        else:
            counts = {opt: 0 for opt in q.get("options", [])}
            comments = []
            total = 0
            for r in responses:
                for a in r["answers"]:
                    if a["question_id"] == qid and a.get("choice") is not None:
                        counts[a["choice"]] = counts.get(a["choice"], 0) + 1
                        total += 1
                        if a.get("comment"):
                            comments.append({"name": "Anonim" if anonymous else emps.get(r["employee_id"], {}).get("name", "—"), "text": a["comment"]})
            distribution = [{"option": o, "count": c, "percent": round(100 * c / total) if total else 0} for o, c in counts.items()]
            questions_out.append({"id": qid, "text": q["text"], "type": "tek_secim", "distribution": distribution, "comments": comments})

    company_trend = [{"date": d, "avg": _mean(all_skor_by_date[d])} for d in sorted(all_skor_by_date)]
    company_avg = _mean([s for v in all_skor_by_date.values() for s in v])
    org_units = [{"department": d, "avg": _mean(v), "count": len(v)} for d, v in dept_scores.items()]

    persons = []
    if not anonymous:
        for r in responses:
            emp = emps.get(r["employee_id"])
            persons.append({
                "employee_id": r["employee_id"],
                "name": emp["name"] if emp else "—",
                "department": emp["department"] if emp else "—",
                "date": r["created_at"][:10],
                "answers": r["answers"],
            })

    return {
        "pulse": pulse, "anonymous": anonymous,
        "target_count": len(target), "response_count": len(responders),
        "response_rate": round(100 * len(responders) / len(target)) if target else 0,
        "questions": questions_out,
        "company": {"avg": company_avg, "trend": company_trend},
        "org_units": org_units, "persons": persons,
    }


@api_router.get("/pulses/{pid}/my-history")
async def pulse_my_history(pid: str, employee_id: str):
    pulse = await db.pulses.find_one({"id": pid}, {"_id": 0})
    if not pulse:
        raise HTTPException(404, "Pulse bulunamadı")
    responses = await db.pulse_responses.find({"pulse_id": pid, "employee_id": employee_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    history = []
    for r in responses:
        scores = [a["score"] for a in r["answers"] if a.get("score") is not None]
        history.append({"date": r["created_at"][:10], "avg": _mean(scores)})
    return {"pulse_title": pulse["title"], "history": history}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_if_empty()
    await seed_pulses_if_empty()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
