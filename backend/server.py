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


class RSVPCreate(BaseModel):
    employee_id: str
    response: str


class EventCreate(BaseModel):
    title: str
    description: str = ""
    image: Optional[str] = None
    location: str = ""
    event_date: Optional[str] = None
    audience: Audience = Field(default_factory=Audience)
    status: str = "yayinda"        # taslak | yayinda | pasif
    allow_maybe: bool = True


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[str] = None
    audience: Optional[Audience] = None
    status: Optional[str] = None
    allow_maybe: Optional[bool] = None


# ----------------------------- Static / Seed data -----------------------------

CATEGORY_TYPES = [
    {"key": "duyuru", "label": "Duyuru", "active": True},
    {"key": "pulse", "label": "Pulse Anketi", "active": True},
    {"key": "etkinlik", "label": "Etkinlik", "active": True},
    {"key": "gunluk_mod", "label": "Günlük Mod", "active": True},
    {"key": "ilan", "label": "İlanlar", "active": True},
    {"key": "avatar", "label": "Avatar Seçimi", "active": True},
    {"key": "servis", "label": "Servis Güzergahı", "active": True},
    {"key": "anket", "label": "Anket", "active": False},
    {"key": "kudos", "label": "Kudos / Takdir", "active": False},
    {"key": "oyunlastirma", "label": "Oyunlaştırma", "active": False},
    {"key": "ic_ilan", "label": "İç İlan", "active": False},
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


@api_router.get("/pulses/{pid}/compare")
async def pulse_compare(pid: str, a_start: str, a_end: str, b_start: str, b_end: str):
    pulse = await db.pulses.find_one({"id": pid}, {"_id": 0})
    if not pulse:
        raise HTTPException(404, "Pulse bulunamadı")
    responses = await db.pulse_responses.find({"pulse_id": pid}, {"_id": 0}).sort("created_at", 1).to_list(100000)

    def avg_in(start, end):
        vals = []
        for r in responses:
            d = r["created_at"][:10]
            if start <= d <= end:
                for a in r["answers"]:
                    if a.get("score") is not None:
                        vals.append(a["score"])
        return {"start": start, "end": end, "avg": _mean(vals), "count": len(vals)}

    by_date = {}
    for r in responses:
        d = r["created_at"][:10]
        for a in r["answers"]:
            if a.get("score") is not None:
                by_date.setdefault(d, []).append(a["score"])
    trend = [{"date": d, "avg": _mean(by_date[d])} for d in sorted(by_date)]
    a = avg_in(a_start, a_end)
    b = avg_in(b_start, b_end)
    return {"a": a, "b": b, "diff": round(b["avg"] - a["avg"], 2), "trend": trend}


def _rsvp_counts(rsvps):
    counts = {"katiliyorum": 0, "katilmiyorum": 0, "belki": 0}
    for r in rsvps:
        counts[r["response"]] = counts.get(r["response"], 0) + 1
    return counts


async def seed_events_if_empty():
    if await db.categories.count_documents({"category_type": "etkinlik"}) > 0:
        return
    ecount = await db.categories.count_documents({})
    ecat_id = new_id()
    await db.categories.insert_one({
        "id": ecat_id, "category_type": "etkinlik", "display_name": "Etkinlikler",
        "icon": "Calendar", "icon_image": None, "status": "active",
        "audience": Audience().model_dump(),
        "reporting_levels": ["kisi", "sirket"], "content_type": "eylem",
        "pinnable": True, "order": ecount, "created_at": now_iso(),
    })
    events = [
        {"title": "Doğa ile Baş Başa — Longoz Ormanları Gezisi", "description": "Doğaya merhaba demeye hazır mısın? Sen de bizimle bu yolculuğa hazırsan hemen aksiyona geç! Rehber eşliğinde doğa yürüyüşü, ikram ve ekip aktiviteleri seni bekliyor.", "location": "İğneada Longoz Ormanları Milli Parkı", "event_date": "2026-08-26T09:00:00", "image": "https://images.unsplash.com/photo-1592859600972-1b0834d83747?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
        {"title": "Q3 Genel Değerlendirme Toplantısı", "description": "Üçüncü çeyrek sonuçlarını, hedeflerimizi ve gelecek dönem planlarımızı birlikte değerlendireceğimiz genel toplantımıza tüm ekiplerimiz davetlidir.", "location": "Merkez Ofis — Konferans Salonu", "event_date": "2026-09-05T14:00:00", "image": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
    ]
    ev_ids = []
    for e in events:
        eid = new_id()
        ev_ids.append(eid)
        await db.events.insert_one({
            "id": eid, "category_id": ecat_id, **e,
            "audience": Audience().model_dump(), "status": "yayinda",
            "allow_maybe": True, "pinned": False,
            "created_at": now_iso(), "updated_at": now_iso(),
        })
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    responses = ["katiliyorum", "katiliyorum", "belki", "katilmiyorum"]
    for i, emp in enumerate(emps[3:7]):
        await db.rsvps.insert_one({
            "id": new_id(), "event_id": ev_ids[0], "employee_id": emp["id"],
            "response": responses[i % len(responses)], "updated_at": now_iso(),
        })


@api_router.get("/events")
async def list_events():
    items = await db.events.find({}, {"_id": 0}).sort("event_date", 1).to_list(1000)
    for e in items:
        rsvps = await db.rsvps.find({"event_id": e["id"]}, {"_id": 0}).to_list(10000)
        e["rsvp_counts"] = _rsvp_counts(rsvps)
    return items


@api_router.post("/events")
async def create_event(payload: EventCreate):
    cat = await db.categories.find_one({"category_type": "etkinlik"}, {"_id": 0})
    doc = {"id": new_id(), "category_id": cat["id"] if cat else None, **payload.model_dump(),
           "pinned": False, "created_at": now_iso(), "updated_at": now_iso()}
    await db.events.insert_one(doc)
    return clean(doc)


@api_router.get("/events/feed")
async def events_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    published = await db.events.find({"status": "yayinda"}, {"_id": 0}).sort("event_date", 1).to_list(1000)
    result = []
    for e in published:
        if employee_matches(emp, e.get("audience")):
            rsvps = await db.rsvps.find({"event_id": e["id"]}, {"_id": 0}).to_list(10000)
            e["rsvp_counts"] = _rsvp_counts(rsvps)
            mine = next((r for r in rsvps if r["employee_id"] == employee_id), None)
            e["my_rsvp"] = mine["response"] if mine else None
            result.append(e)
    return result


@api_router.get("/events/{eid}")
async def get_event(eid: str, employee_id: Optional[str] = None):
    doc = await db.events.find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Etkinlik bulunamadı")
    rsvps = await db.rsvps.find({"event_id": eid}, {"_id": 0}).to_list(10000)
    doc["rsvp_counts"] = _rsvp_counts(rsvps)
    if employee_id:
        mine = next((r for r in rsvps if r["employee_id"] == employee_id), None)
        doc["my_rsvp"] = mine["response"] if mine else None
    return doc


@api_router.put("/events/{eid}")
async def update_event(eid: str, payload: EventUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    update["updated_at"] = now_iso()
    res = await db.events.update_one({"id": eid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Etkinlik bulunamadı")
    return await db.events.find_one({"id": eid}, {"_id": 0})


@api_router.delete("/events/{eid}")
async def delete_event(eid: str):
    await db.events.delete_one({"id": eid})
    await db.rsvps.delete_many({"event_id": eid})
    return {"ok": True}


@api_router.get("/events/{eid}/report")
async def event_report(eid: str):
    ev = await db.events.find_one({"id": eid}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Etkinlik bulunamadı")
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    rsvps = await db.rsvps.find({"event_id": eid}, {"_id": 0}).to_list(10000)
    counts = _rsvp_counts(rsvps)
    total_responded = len(rsvps)
    target = [e for e in emps.values() if employee_matches(e, ev.get("audience"))]
    dept = {}
    for r in rsvps:
        emp = emps.get(r["employee_id"])
        if not emp:
            continue
        d = emp["department"]
        dept.setdefault(d, {"department": d, "katiliyorum": 0, "belki": 0, "katilmiyorum": 0, "total": 0})
        dept[d][r["response"]] = dept[d].get(r["response"], 0) + 1
        dept[d]["total"] += 1
    return {
        "event": ev, "counts": counts, "total_responded": total_responded,
        "target_count": len(target),
        "response_rate": round(100 * total_responded / len(target)) if target else 0,
        "departments": list(dept.values()),
    }


@api_router.post("/events/{eid}/rsvp")
async def rsvp_event(eid: str, payload: RSVPCreate):
    ev = await db.events.find_one({"id": eid}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Etkinlik bulunamadı")
    await db.rsvps.update_one(
        {"event_id": eid, "employee_id": payload.employee_id},
        {"$set": {"response": payload.response, "updated_at": now_iso()},
         "$setOnInsert": {"id": new_id()}},
        upsert=True,
    )
    rsvps = await db.rsvps.find({"event_id": eid}, {"_id": 0}).to_list(10000)
    return {"ok": True, "rsvp_counts": _rsvp_counts(rsvps), "my_rsvp": payload.response}


class MoodConfigUpdate(BaseModel):
    display_name: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None
    audience: Optional[Audience] = None
    allow_comment: Optional[bool] = None
    reminder_enabled: Optional[bool] = None
    reminder_time: Optional[str] = None


class MoodEntryCreate(BaseModel):
    employee_id: str
    score: int
    comment: Optional[str] = None


class ListingConfigUpdate(BaseModel):
    display_name: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None
    audience: Optional[Audience] = None
    notification_channels: Optional[List[str]] = None
    default_duration_days: Optional[int] = None


class ListingCreate(BaseModel):
    employee_id: str
    type: str                       # satilik | kiralik | araniyor
    title: str
    description: str = ""
    images: List[str] = []
    contact: str = ""


async def seed_mood_if_empty():
    if await db.categories.count_documents({"category_type": "gunluk_mod"}) > 0:
        return
    import random
    from datetime import timedelta
    mcount = await db.categories.count_documents({})
    mcat_id = new_id()
    await db.categories.insert_one({
        "id": mcat_id, "category_type": "gunluk_mod", "display_name": "Günlük Mod",
        "icon": "Smile", "icon_image": None, "status": "active",
        "audience": Audience().model_dump(),
        "reporting_levels": ["organizasyon", "sirket"], "content_type": "eylem",
        "pinnable": False, "order": mcount, "created_at": now_iso(),
        "allow_comment": True, "reminder_enabled": True, "reminder_time": "17:00",
    })
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    today = datetime.now(timezone.utc).date()
    for off in range(1, 7):
        d = (today - timedelta(days=off)).isoformat()
        for emp in emps[2:8]:
            await db.mood_entries.insert_one({
                "id": new_id(), "employee_id": emp["id"], "score": random.randint(3, 5),
                "comment": None, "date": d, "created_at": d + "T09:00:00+00:00",
            })
    # a couple of entries for today (but NOT the default employee viewer, so their widget shows form)
    td = today.isoformat()
    for emp in emps[4:6]:
        await db.mood_entries.insert_one({
            "id": new_id(), "employee_id": emp["id"], "score": random.randint(3, 5),
            "comment": None, "date": td, "created_at": now_iso(),
        })


@api_router.get("/mood/config")
async def get_mood_config():
    doc = await db.categories.find_one({"category_type": "gunluk_mod"}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Günlük Mod yapılandırması bulunamadı")
    return doc


@api_router.put("/mood/config")
async def update_mood_config(payload: MoodConfigUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    res = await db.categories.update_one({"category_type": "gunluk_mod"}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Günlük Mod yapılandırması bulunamadı")
    return await db.categories.find_one({"category_type": "gunluk_mod"}, {"_id": 0})


@api_router.get("/mood/today")
async def mood_today(employee_id: str):
    td = datetime.now(timezone.utc).date().isoformat()
    e = await db.mood_entries.find_one({"employee_id": employee_id, "date": td}, {"_id": 0})
    return {"entry": e}


@api_router.post("/mood/entry")
async def create_mood_entry(payload: MoodEntryCreate):
    td = datetime.now(timezone.utc).date().isoformat()
    existing = await db.mood_entries.find_one({"employee_id": payload.employee_id, "date": td}, {"_id": 0})
    if existing:
        return {"already": True, "entry": existing}
    doc = {
        "id": new_id(), "employee_id": payload.employee_id, "score": payload.score,
        "comment": payload.comment, "date": td, "created_at": now_iso(),
    }
    await db.mood_entries.insert_one(doc)
    return {"already": False, "entry": clean(doc)}


@api_router.get("/mood/my-history")
async def mood_my_history(employee_id: str):
    from datetime import timedelta
    since = (datetime.now(timezone.utc).date() - timedelta(days=6)).isoformat()
    entries = await db.mood_entries.find({"employee_id": employee_id, "date": {"$gte": since}}, {"_id": 0}).sort("date", 1).to_list(1000)
    trend = [{"date": e["date"], "score": e["score"]} for e in entries]
    avg7 = _mean([e["score"] for e in entries])
    return {"trend": trend, "avg7": avg7, "count": len(entries)}


@api_router.get("/mood/report")
async def mood_report(department: Optional[str] = None):
    from datetime import timedelta
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    entries = await db.mood_entries.find({}, {"_id": 0}).to_list(100000)
    if department:
        allowed = {eid for eid, e in emps.items() if e["department"] == department}
        entries = [e for e in entries if e["employee_id"] in allowed]

    by_date = {}
    for e in entries:
        by_date.setdefault(e["date"], []).append(e["score"])
    trend = [{"date": d, "avg": _mean(by_date[d]), "count": len(by_date[d])} for d in sorted(by_date)]

    td = datetime.now(timezone.utc).date().isoformat()
    today_avg = _mean(by_date.get(td, []))
    since = (datetime.now(timezone.utc).date() - timedelta(days=6)).isoformat()
    last7 = [e["score"] for e in entries if e["date"] >= since]
    return {
        "trend": trend, "today_avg": today_avg, "avg7": _mean(last7),
        "total_entries": len(entries), "today_count": len(by_date.get(td, [])),
        "departments": SEGMENT_OPTIONS["departments"],
    }


def _slugify(name):
    tr = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosucgiosu")
    parts = name.translate(tr).lower().split()
    return ".".join(parts) if parts else "kullanici"


async def backfill_contacts():
    emps = await db.employees.find({}).to_list(1000)
    for i, e in enumerate(emps):
        if not e.get("email"):
            await db.employees.update_one({"id": e["id"]}, {"$set": {
                "email": f"{_slugify(e['name'])}@plena.com",
                "phone": f"+90 5{(30 + i) % 60:02d} {100 + i} {(10 + i) % 90:02d} {(20 + i) % 90:02d}",
            }})


async def _expire_listings():
    await db.listings.update_many(
        {"status": "yayinda", "expires_at": {"$lt": now_iso()}},
        {"$set": {"status": "suresi_doldu"}},
    )


async def seed_listings_if_empty():
    if await db.categories.count_documents({"category_type": "ilan"}) > 0:
        return
    await backfill_contacts()
    lcount = await db.categories.count_documents({})
    lcat_id = new_id()
    await db.categories.insert_one({
        "id": lcat_id, "category_type": "ilan", "display_name": "İlanlar",
        "icon": "Tag", "icon_image": None, "status": "active",
        "audience": Audience().model_dump(),
        "reporting_levels": ["kisi"], "content_type": "pasif",
        "pinnable": False, "order": lcount, "created_at": now_iso(),
        "notification_channels": ["mail", "push"], "default_duration_days": 30,
    })
    from datetime import timedelta
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    now_dt = datetime.now(timezone.utc)
    samples = [
        {"type": "satilik", "title": "2019 Model Temiz Otomobil Satılık", "description": "Az kullanılmış, bakımlı, tek sahibinden. Detaylı bilgi için iletişime geçebilirsiniz.", "status": "yayinda"},
        {"type": "kiralik", "title": "Merkeze Yakın 2+1 Kiralık Daire", "description": "Ofise yürüme mesafesinde, eşyalı, hemen taşınmaya hazır.", "status": "yayinda"},
        {"type": "araniyor", "title": "Ev Arkadaşı Aranıyor", "description": "Şirkete yakın 3+1 dairede oda arkadaşı arıyorum.", "status": "onay_bekliyor"},
    ]
    for i, s in enumerate(samples):
        emp = emps[(i + 2) % len(emps)]
        published = s["status"] == "yayinda"
        await db.listings.insert_one({
            "id": new_id(), "employee_id": emp["id"], "type": s["type"],
            "title": s["title"], "description": s["description"], "images": [],
            "contact": f"{emp.get('email', '')} · {emp.get('phone', '')}",
            "status": s["status"],
            "created_at": (now_dt - timedelta(days=i)).isoformat(),
            "published_at": now_dt.isoformat() if published else None,
            "expires_at": (now_dt + timedelta(days=30 - i * 3)).isoformat() if published else None,
        })


def _listing_out(l, emps):
    emp = emps.get(l["employee_id"])
    l["owner_name"] = emp["name"] if emp else "—"
    return l


@api_router.get("/listings/config")
async def get_listings_config():
    doc = await db.categories.find_one({"category_type": "ilan"}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "İlan yapılandırması bulunamadı")
    return doc


@api_router.put("/listings/config")
async def update_listings_config(payload: ListingConfigUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    res = await db.categories.update_one({"category_type": "ilan"}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "İlan yapılandırması bulunamadı")
    return await db.categories.find_one({"category_type": "ilan"}, {"_id": 0})


@api_router.get("/listings")
async def list_listings(status: Optional[str] = None, type: Optional[str] = None, q: Optional[str] = None):
    await _expire_listings()
    query = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    items = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    if q:
        items = [i for i in items if q.lower() in i["title"].lower()]
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    return [_listing_out(i, emps) for i in items]


@api_router.get("/listings/feed")
async def listings_feed(employee_id: str, type: Optional[str] = None):
    await _expire_listings()
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    cat = await db.categories.find_one({"category_type": "ilan"}, {"_id": 0})
    query = {"status": "yayinda"}
    if type and type != "all":
        query["type"] = type
    items = await db.listings.find(query, {"_id": 0}).sort("published_at", -1).to_list(1000)
    if cat and not employee_matches(emp, cat.get("audience")):
        items = []
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    return [_listing_out(i, emps) for i in items]


@api_router.get("/listings/mine")
async def listings_mine(employee_id: str):
    await _expire_listings()
    items = await db.listings.find({"employee_id": employee_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    return [_listing_out(i, emps) for i in items]


@api_router.get("/listings/{lid}")
async def get_listing(lid: str):
    await _expire_listings()
    doc = await db.listings.find_one({"id": lid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "İlan bulunamadı")
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    return _listing_out(doc, emps)


@api_router.post("/listings")
async def create_listing(payload: ListingCreate):
    if payload.type not in ("satilik", "kiralik", "araniyor"):
        raise HTTPException(400, "Geçersiz ilan türü")
    if len(payload.images) > 5:
        raise HTTPException(400, "En fazla 5 fotoğraf yüklenebilir")
    doc = {
        "id": new_id(), "employee_id": payload.employee_id, "type": payload.type,
        "title": payload.title, "description": payload.description,
        "images": payload.images, "contact": payload.contact,
        "status": "onay_bekliyor", "created_at": now_iso(),
        "published_at": None, "expires_at": None,
    }
    await db.listings.insert_one(doc)
    return clean(doc)


@api_router.post("/listings/{lid}/approve")
async def approve_listing(lid: str):
    from datetime import timedelta
    cat = await db.categories.find_one({"category_type": "ilan"}, {"_id": 0})
    days = (cat or {}).get("default_duration_days", 30)
    now_dt = datetime.now(timezone.utc)
    res = await db.listings.update_one({"id": lid}, {"$set": {
        "status": "yayinda", "published_at": now_dt.isoformat(),
        "expires_at": (now_dt + timedelta(days=days)).isoformat(),
    }})
    if res.matched_count == 0:
        raise HTTPException(404, "İlan bulunamadı")
    return await db.listings.find_one({"id": lid}, {"_id": 0})


@api_router.post("/listings/{lid}/reject")
async def reject_listing(lid: str):
    res = await db.listings.update_one({"id": lid}, {"$set": {"status": "reddedildi"}})
    if res.matched_count == 0:
        raise HTTPException(404, "İlan bulunamadı")
    return await db.listings.find_one({"id": lid}, {"_id": 0})


@api_router.post("/listings/{lid}/close")
async def close_listing(lid: str):
    res = await db.listings.update_one({"id": lid}, {"$set": {"status": "kapali"}})
    if res.matched_count == 0:
        raise HTTPException(404, "İlan bulunamadı")
    return await db.listings.find_one({"id": lid}, {"_id": 0})


@api_router.delete("/listings/{lid}")
async def delete_listing(lid: str):
    await db.listings.delete_one({"id": lid})
    return {"ok": True}


class ConceptCreate(BaseModel):
    name: str
    cover: Optional[str] = None
    style: str = "bottts"
    audience: Optional[Audience] = None
    count: int = 12


class ConceptUpdate(BaseModel):
    name: Optional[str] = None
    cover: Optional[str] = None
    style: Optional[str] = None
    audience: Optional[Audience] = None
    status: Optional[str] = None


class AvatarSelect(BaseModel):
    employee_id: str
    avatar: str


def gen_avatars(style, count):
    return [f"https://api.dicebear.com/9.x/{style}/svg?seed={style}-{new_id()[:8]}" for _ in range(count)]


async def seed_avatars_if_empty():
    if await db.categories.count_documents({"category_type": "avatar"}) > 0:
        return
    acount = await db.categories.count_documents({})
    acat_id = new_id()
    await db.categories.insert_one({
        "id": acat_id, "category_type": "avatar", "display_name": "Avatar Seçimi",
        "icon": "Sparkles", "icon_image": None, "status": "active",
        "audience": Audience().model_dump(),
        "reporting_levels": ["sirket"], "content_type": "pasif",
        "pinnable": False, "order": acount, "created_at": now_iso(),
    })
    concepts = [
        {"name": "Hayvanlar", "style": "thumbs", "audience": None},
        {"name": "Robotlar", "style": "bottts", "audience": None},
        {"name": "Klasik", "style": "avataaars", "audience": None},
        {"name": "Yönetici Özel", "style": "adventurer", "audience": {**Audience().model_dump(), "all": False, "titles": ["Yönetici", "Direktör"]}},
    ]
    for c in concepts:
        avatars = gen_avatars(c["style"], 12)
        await db.avatar_concepts.insert_one({
            "id": new_id(), "category_id": acat_id, "name": c["name"], "style": c["style"],
            "cover": avatars[0], "audience": c["audience"], "status": "active",
            "avatars": avatars, "created_at": now_iso(),
        })


@api_router.get("/avatar/config")
async def get_avatar_config():
    doc = await db.categories.find_one({"category_type": "avatar"}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Avatar yapılandırması bulunamadı")
    return doc


@api_router.get("/avatar/concepts")
async def list_concepts():
    return await db.avatar_concepts.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/avatar/concepts")
async def create_concept(payload: ConceptCreate):
    avatars = gen_avatars(payload.style, max(1, min(payload.count, 15)))
    cat = await db.categories.find_one({"category_type": "avatar"}, {"_id": 0})
    doc = {
        "id": new_id(), "category_id": cat["id"] if cat else None, "name": payload.name,
        "style": payload.style, "cover": payload.cover or avatars[0],
        "audience": payload.audience.model_dump() if payload.audience else None,
        "status": "active", "avatars": avatars, "created_at": now_iso(),
    }
    await db.avatar_concepts.insert_one(doc)
    return clean(doc)


@api_router.put("/avatar/concepts/{cid}")
async def update_concept(cid: str, payload: ConceptUpdate):
    data = payload.model_dump(exclude_unset=True)
    update = {}
    for k in ("name", "cover", "style", "status"):
        if data.get(k) is not None:
            update[k] = data[k]
    if "audience" in data:
        update["audience"] = payload.audience.model_dump() if payload.audience else None
    res = await db.avatar_concepts.update_one({"id": cid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Konsept bulunamadı")
    return await db.avatar_concepts.find_one({"id": cid}, {"_id": 0})


@api_router.post("/avatar/concepts/{cid}/add")
async def add_avatar(cid: str):
    concept = await db.avatar_concepts.find_one({"id": cid}, {"_id": 0})
    if not concept:
        raise HTTPException(404, "Konsept bulunamadı")
    new_av = gen_avatars(concept.get("style", "bottts"), 1)[0]
    await db.avatar_concepts.update_one({"id": cid}, {"$push": {"avatars": new_av}})
    return await db.avatar_concepts.find_one({"id": cid}, {"_id": 0})


@api_router.post("/avatar/concepts/{cid}/remove")
async def remove_avatar(cid: str, payload: dict):
    await db.avatar_concepts.update_one({"id": cid}, {"$pull": {"avatars": payload.get("avatar")}})
    return await db.avatar_concepts.find_one({"id": cid}, {"_id": 0})


@api_router.delete("/avatar/concepts/{cid}")
async def delete_concept(cid: str):
    await db.avatar_concepts.delete_one({"id": cid})
    return {"ok": True}


@api_router.get("/avatar/concepts/feed")
async def concepts_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    cat = await db.categories.find_one({"category_type": "avatar"}, {"_id": 0})
    concepts = await db.avatar_concepts.find({"status": "active"}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    result = []
    for c in concepts:
        aud = c.get("audience") or (cat.get("audience") if cat else None)
        if employee_matches(emp, aud):
            result.append(c)
    return result


@api_router.post("/avatar/select")
async def select_avatar(payload: AvatarSelect):
    res = await db.employees.update_one({"id": payload.employee_id}, {"$set": {"avatar": payload.avatar}})
    if res.matched_count == 0:
        raise HTTPException(404, "Çalışan bulunamadı")
    return {"ok": True, "avatar": payload.avatar}


@api_router.get("/avatar/report")
async def avatar_report():
    concepts = await db.avatar_concepts.find({}, {"_id": 0}).to_list(1000)
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    selected = [e.get("avatar") for e in emps if e.get("avatar")]
    rows = []
    for c in concepts:
        cnt = sum(1 for a in selected if a in c["avatars"])
        rows.append({"name": c["name"], "count": cnt})
    return {"concepts": rows, "total_selected": len(selected), "total_employees": len(emps)}


# ----------------------------- Servis Güzergahı -----------------------------

class RouteStop(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    time: str = ""                    # "08:15"
    location: Optional[str] = None    # adres / harita arama metni


class RouteCreate(BaseModel):
    name: str
    direction: str = "gidis"          # gidis | donus
    city: str = ""                    # servis lokasyonu (şehir)
    vehicle_plate: str = ""
    driver_name: str = ""
    driver_phone: str = ""
    stops: List[RouteStop] = []
    status: str = "active"            # active | passive


class RouteUpdate(BaseModel):
    name: Optional[str] = None
    direction: Optional[str] = None
    city: Optional[str] = None
    vehicle_plate: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    stops: Optional[List[RouteStop]] = None
    status: Optional[str] = None


class RouteRegister(BaseModel):
    employee_id: str
    stop_id: Optional[str] = None


async def seed_routes_if_empty():
    if await db.categories.count_documents({"category_type": "servis"}) > 0:
        return
    rcount = await db.categories.count_documents({})
    rcat_id = new_id()
    await db.categories.insert_one({
        "id": rcat_id, "category_type": "servis", "display_name": "Servis Güzergahı",
        "icon": "Bus", "icon_image": None, "status": "active",
        "audience": Audience().model_dump(),
        "reporting_levels": ["sirket", "organizasyon"], "content_type": "eylem",
        "pinnable": False, "order": rcount, "created_at": now_iso(),
    })
    routes = [
        {
            "name": "Kadıköy Hattı", "direction": "gidis", "city": "İstanbul",
            "vehicle_plate": "34 PLN 001", "driver_name": "Hasan Demir", "driver_phone": "0532 111 22 33",
            "stops": [
                {"name": "Kadıköy Meydan", "time": "07:45", "location": "Kadıköy İskele, İstanbul"},
                {"name": "Söğütlüçeşme", "time": "07:55", "location": "Söğütlüçeşme, İstanbul"},
                {"name": "Acıbadem", "time": "08:10", "location": "Acıbadem, İstanbul"},
                {"name": "Merkez Ofis", "time": "08:30", "location": "Maslak, İstanbul"},
            ],
        },
        {
            "name": "Bağcılar Hattı", "direction": "gidis", "city": "İstanbul",
            "vehicle_plate": "34 PLN 002", "driver_name": "Murat Yıldız", "driver_phone": "0533 444 55 66",
            "stops": [
                {"name": "Bağcılar Meydan", "time": "07:30", "location": "Bağcılar Meydan, İstanbul"},
                {"name": "Güneşli", "time": "07:45", "location": "Güneşli, İstanbul"},
                {"name": "Merkez Ofis", "time": "08:30", "location": "Maslak, İstanbul"},
            ],
        },
    ]
    for r in routes:
        stops = [{"id": new_id(), **s} for s in r["stops"]]
        await db.routes.insert_one({
            "id": new_id(), "category_id": rcat_id, "name": r["name"], "direction": r["direction"],
            "city": r["city"], "vehicle_plate": r["vehicle_plate"], "driver_name": r["driver_name"],
            "driver_phone": r["driver_phone"], "stops": stops, "status": "active",
            "created_at": now_iso(), "updated_at": now_iso(),
        })


def _stop_name(route, stop_id):
    for s in route.get("stops", []):
        if s.get("id") == stop_id:
            return s.get("name")
    return None


@api_router.get("/routes")
async def list_routes():
    items = await db.routes.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for r in items:
        regs = await db.route_registrations.find({"route_id": r["id"]}, {"_id": 0}).to_list(10000)
        r["reg_count"] = len(regs)
    return items


@api_router.post("/routes")
async def create_route(payload: RouteCreate):
    cat = await db.categories.find_one({"category_type": "servis"}, {"_id": 0})
    data = payload.model_dump()
    data["stops"] = [{"id": s.get("id") or new_id(), **{k: v for k, v in s.items() if k != "id"}} for s in data.get("stops", [])]
    doc = {"id": new_id(), "category_id": cat["id"] if cat else None, **data,
           "created_at": now_iso(), "updated_at": now_iso()}
    await db.routes.insert_one(doc)
    return clean(doc)


@api_router.get("/routes/feed")
async def routes_feed(employee_id: str, city: Optional[str] = None):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    query = {"status": "active"}
    if city:
        query["city"] = city
    routes = await db.routes.find(query, {"_id": 0}).sort("created_at", 1).to_list(1000)
    result = []
    for r in routes:
        regs = await db.route_registrations.find({"route_id": r["id"]}, {"_id": 0}).to_list(10000)
        r["reg_count"] = len(regs)
        mine = next((x for x in regs if x["employee_id"] == employee_id), None)
        r["my_registration"] = {"stop_id": mine["stop_id"], "stop_name": _stop_name(r, mine["stop_id"])} if mine else None
        result.append(r)
    return result


@api_router.get("/routes/cities")
async def route_cities():
    cities = await db.routes.distinct("city", {"status": "active"})
    return [c for c in cities if c]


@api_router.get("/routes/report")
async def routes_report():
    routes = await db.routes.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    rows = []
    total_reg = 0
    for r in routes:
        regs = await db.route_registrations.find({"route_id": r["id"]}, {"_id": 0}).to_list(10000)
        total_reg += len(regs)
        stop_map = {s["id"]: {"stop_id": s["id"], "name": s["name"], "time": s.get("time", ""), "count": 0} for s in r.get("stops", [])}
        for reg in regs:
            if reg.get("stop_id") in stop_map:
                stop_map[reg["stop_id"]]["count"] += 1
        rows.append({
            "id": r["id"], "name": r["name"], "city": r.get("city", ""),
            "direction": r.get("direction", "gidis"), "reg_count": len(regs),
            "stops": list(stop_map.values()),
        })
    return {"routes": rows, "total_registrations": total_reg, "total_employees": len(emps)}


@api_router.get("/routes/{rid}")
async def get_route(rid: str, employee_id: Optional[str] = None):
    doc = await db.routes.find_one({"id": rid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Güzergah bulunamadı")
    regs = await db.route_registrations.find({"route_id": rid}, {"_id": 0}).to_list(10000)
    doc["reg_count"] = len(regs)
    if employee_id:
        mine = next((x for x in regs if x["employee_id"] == employee_id), None)
        doc["my_registration"] = {"stop_id": mine["stop_id"], "stop_name": _stop_name(doc, mine["stop_id"])} if mine else None
    return doc


@api_router.put("/routes/{rid}")
async def update_route(rid: str, payload: RouteUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "stops" in update:
        update["stops"] = [{"id": s.get("id") or new_id(), **{k: v for k, v in s.items() if k != "id"}} for s in update["stops"]]
    update["updated_at"] = now_iso()
    res = await db.routes.update_one({"id": rid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Güzergah bulunamadı")
    return await db.routes.find_one({"id": rid}, {"_id": 0})


@api_router.delete("/routes/{rid}")
async def delete_route(rid: str):
    await db.routes.delete_one({"id": rid})
    await db.route_registrations.delete_many({"route_id": rid})
    return {"ok": True}


@api_router.post("/routes/{rid}/register")
async def register_route(rid: str, payload: RouteRegister):
    route = await db.routes.find_one({"id": rid}, {"_id": 0})
    if not route:
        raise HTTPException(404, "Güzergah bulunamadı")
    if payload.stop_id and not _stop_name(route, payload.stop_id):
        raise HTTPException(400, "Geçersiz durak")
    await db.route_registrations.update_one(
        {"route_id": rid, "employee_id": payload.employee_id},
        {"$set": {"stop_id": payload.stop_id, "updated_at": now_iso()},
         "$setOnInsert": {"id": new_id()}},
        upsert=True,
    )
    regs = await db.route_registrations.find({"route_id": rid}, {"_id": 0}).to_list(10000)
    return {"ok": True, "reg_count": len(regs),
            "my_registration": {"stop_id": payload.stop_id, "stop_name": _stop_name(route, payload.stop_id)}}


@api_router.post("/routes/{rid}/unregister")
async def unregister_route(rid: str, payload: RouteRegister):
    await db.route_registrations.delete_one({"route_id": rid, "employee_id": payload.employee_id})
    regs = await db.route_registrations.find({"route_id": rid}, {"_id": 0}).to_list(10000)
    return {"ok": True, "reg_count": len(regs), "my_registration": None}


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
    await seed_events_if_empty()
    await seed_mood_if_empty()
    await seed_listings_if_empty()
    await seed_avatars_if_empty()
    await seed_routes_if_empty()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
