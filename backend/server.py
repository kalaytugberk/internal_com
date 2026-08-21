from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
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
    use_service: bool = False
    route_id: Optional[str] = None


class EventCheckin(BaseModel):
    employee_id: str


class EventCreate(BaseModel):
    title: str
    description: str = ""
    image: Optional[str] = None
    location: str = ""
    event_date: Optional[str] = None
    audience: Audience = Field(default_factory=Audience)
    status: str = "yayinda"        # taslak | yayinda | pasif
    allow_maybe: bool = True
    capacity: Optional[int] = None
    service_link: bool = False


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[str] = None
    audience: Optional[Audience] = None
    status: Optional[str] = None
    allow_maybe: Optional[bool] = None
    capacity: Optional[int] = None
    service_link: Optional[bool] = None


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
    if not audience:
        return True
    # Yeni şema: isimli hedef kitle (dahil/hariç kriterler)
    if "includes" in audience or "excludes" in audience:
        includes = audience.get("includes") or []
        excludes = audience.get("excludes") or []

        def _cm(c):
            vals = c.get("values") or []
            return bool(vals) and emp.get(c.get("field")) in vals

        if includes and not all(_cm(c) for c in includes):
            return False
        if any(_cm(c) for c in excludes):
            return False
        return True
    if audience.get("all"):
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
        doc["my_service"] = mine.get("route_id") if mine else None
        ci = await db.event_checkins.find_one({"event_id": eid, "employee_id": employee_id}, {"_id": 0})
        doc["my_checkin"] = bool(ci)
    doc["checkin_count"] = await db.event_checkins.count_documents({"event_id": eid})
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
        "checkin_count": await db.event_checkins.count_documents({"event_id": eid}),
        "service_count": await db.rsvps.count_documents({"event_id": eid, "use_service": True}),
        "departments": list(dept.values()),
    }


@api_router.post("/events/{eid}/rsvp")
async def rsvp_event(eid: str, payload: RSVPCreate):
    ev = await db.events.find_one({"id": eid}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Etkinlik bulunamadı")
    if payload.response == "katiliyorum" and ev.get("capacity"):
        others = await db.rsvps.count_documents({"event_id": eid, "response": "katiliyorum", "employee_id": {"$ne": payload.employee_id}})
        if others >= ev["capacity"]:
            raise HTTPException(400, "Kontenjan dolu")
    await db.rsvps.update_one(
        {"event_id": eid, "employee_id": payload.employee_id},
        {"$set": {"response": payload.response, "use_service": payload.use_service, "route_id": payload.route_id, "updated_at": now_iso()},
         "$setOnInsert": {"id": new_id()}},
        upsert=True,
    )
    rsvps = await db.rsvps.find({"event_id": eid}, {"_id": 0}).to_list(10000)
    return {"ok": True, "rsvp_counts": _rsvp_counts(rsvps), "my_rsvp": payload.response, "my_service": payload.route_id}


@api_router.post("/events/{eid}/checkin")
async def event_checkin(eid: str, payload: EventCheckin):
    ev = await db.events.find_one({"id": eid}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Etkinlik bulunamadı")
    await db.event_checkins.update_one(
        {"event_id": eid, "employee_id": payload.employee_id},
        {"$set": {"at": now_iso()}, "$setOnInsert": {"id": new_id()}}, upsert=True)
    return {"ok": True, "checkin_count": await db.event_checkins.count_documents({"event_id": eid})}


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


# ----------------------------- Hedef Kitle (Audiences) -----------------------------

class Criterion(BaseModel):
    field: str = "department"          # department | location | title | seniority
    values: List[str] = []


class AudienceDefCreate(BaseModel):
    name: str
    description: str = ""
    module: str = "İç İletişim"
    includes: List[Criterion] = []
    excludes: List[Criterion] = []


class AudienceDefUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    module: Optional[str] = None
    includes: Optional[List[Criterion]] = None
    excludes: Optional[List[Criterion]] = None


class AudiencePreview(BaseModel):
    includes: List[Criterion] = []
    excludes: List[Criterion] = []


async def seed_audiences_if_empty():
    if await db.audiences.count_documents({}) > 0:
        return
    samples = [
        {"name": "Tüm Mühendislik", "description": "Mühendislik departmanı", "module": "İç İletişim",
         "includes": [{"field": "department", "values": ["Mühendislik"]}], "excludes": []},
        {"name": "İstanbul Ofisi", "description": "İstanbul lokasyonundaki çalışanlar", "module": "İç İletişim",
         "includes": [{"field": "location", "values": ["İstanbul"]}], "excludes": []},
        {"name": "Yöneticiler (Direktör hariç)", "description": "Yönetici/Direktör, direktörler hariç", "module": "İç İletişim",
         "includes": [{"field": "title", "values": ["Yönetici", "Direktör"]}],
         "excludes": [{"field": "title", "values": ["Direktör"]}]},
    ]
    for s in samples:
        await db.audiences.insert_one({"id": new_id(), **s, "created_at": now_iso()})


@api_router.get("/audiences")
async def list_audiences():
    return await db.audiences.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/audiences")
async def create_audience(payload: AudienceDefCreate):
    doc = {"id": new_id(), **payload.model_dump(), "created_at": now_iso()}
    await db.audiences.insert_one(doc)
    return clean(doc)


@api_router.post("/audiences/preview")
async def preview_audience(payload: AudiencePreview):
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    aud = {"includes": [c.model_dump() for c in payload.includes],
           "excludes": [c.model_dump() for c in payload.excludes]}
    matched = [e for e in emps if employee_matches(e, aud)]
    return {
        "count": len(matched), "total": len(emps),
        "employees": [{"id": e["id"], "name": e["name"], "department": e.get("department"),
                       "location": e.get("location"), "title": e.get("title")} for e in matched],
    }


@api_router.put("/audiences/{aid}")
async def update_audience(aid: str, payload: AudienceDefUpdate):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    res = await db.audiences.update_one({"id": aid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Hedef kitle bulunamadı")
    return await db.audiences.find_one({"id": aid}, {"_id": 0})


@api_router.delete("/audiences/{aid}")
async def delete_audience(aid: str):
    await db.audiences.delete_one({"id": aid})
    return {"ok": True}


# ----------------------------- Bildirim Motoru (Anlık Bildirim + İSG Acil) -----------------------------

class NotifOption(BaseModel):
    key: str
    label: str


class NotificationCreate(BaseModel):
    kind: str = "anlik_bildirim"       # anlik_bildirim | isg_acil
    title: str = ""
    message: str
    channels: List[str] = []           # sms | push | mail (MOCK — gerçek gönderim yok)
    audience: Dict[str, Any] = Field(default_factory=lambda: {"all": True})
    options: List[NotifOption]         # tam 2 seçenek
    reminder_enabled: bool = False
    reminder_minutes: int = 15


class NotifRespond(BaseModel):
    employee_id: str
    option_key: str


async def seed_notification_cats():
    for kind, name, icon in [("anlik_bildirim", "Anlık Bildirim", "Bell"), ("isg_acil", "İSG — Acil Durum", "ShieldAlert")]:
        if await db.categories.count_documents({"category_type": kind}) == 0:
            cnt = await db.categories.count_documents({})
            await db.categories.insert_one({
                "id": new_id(), "category_type": kind, "display_name": name, "icon": icon,
                "icon_image": None, "status": "active", "audience": Audience().model_dump(),
                "reporting_levels": ["sirket", "organizasyon"], "content_type": "eylem",
                "pinnable": False, "order": cnt, "created_at": now_iso(),
            })


def _notif_counts(resps, options):
    c = {o["key"]: 0 for o in options}
    for r in resps:
        if r["option_key"] in c:
            c[r["option_key"]] += 1
    return c


@api_router.get("/notifications")
async def list_notifications(kind: str):
    items = await db.notifications.find({"kind": kind}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for n in items:
        resps = await db.notification_responses.find({"notification_id": n["id"]}, {"_id": 0}).to_list(10000)
        n["counts"] = _notif_counts(resps, n["options"])
        n["responded"] = len(resps)
    return items


@api_router.post("/notifications")
async def create_notification(payload: NotificationCreate):
    if len(payload.options) != 2:
        raise HTTPException(400, "Tam 2 yanıt seçeneği gereklidir")
    cat = await db.categories.find_one({"category_type": payload.kind}, {"_id": 0})
    doc = {"id": new_id(), "category_id": cat["id"] if cat else None, **payload.model_dump(), "created_at": now_iso()}
    await db.notifications.insert_one(doc)
    return clean(doc)


@api_router.get("/notifications/feed")
async def notifications_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    items = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for n in items:
        if not employee_matches(emp, n.get("audience")):
            continue
        mine = await db.notification_responses.find_one({"notification_id": n["id"], "employee_id": employee_id}, {"_id": 0})
        n["my_response"] = mine["option_key"] if mine else None
        result.append(n)
    return result


@api_router.post("/notifications/{nid}/respond")
async def respond_notification(nid: str, payload: NotifRespond):
    n = await db.notifications.find_one({"id": nid}, {"_id": 0})
    if not n:
        raise HTTPException(404, "Bildirim bulunamadı")
    if not any(o["key"] == payload.option_key for o in n["options"]):
        raise HTTPException(400, "Geçersiz seçenek")
    if await db.notification_responses.find_one({"notification_id": nid, "employee_id": payload.employee_id}):
        raise HTTPException(400, "Zaten yanıtladınız")
    await db.notification_responses.insert_one({
        "id": new_id(), "notification_id": nid, "employee_id": payload.employee_id,
        "option_key": payload.option_key, "responded_at": now_iso(),
    })
    return {"ok": True, "my_response": payload.option_key}


@api_router.get("/notifications/{nid}/report")
async def notification_report(nid: str):
    n = await db.notifications.find_one({"id": nid}, {"_id": 0})
    if not n:
        raise HTTPException(404, "Bildirim bulunamadı")
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    target = [e for e in emps if employee_matches(e, n.get("audience"))]
    resps = await db.notification_responses.find({"notification_id": nid}, {"_id": 0}).to_list(10000)
    rmap = {r["employee_id"]: r["option_key"] for r in resps}
    responded = [{"id": e["id"], "name": e["name"], "department": e.get("department"), "option": rmap[e["id"]]} for e in target if e["id"] in rmap]
    not_responded = [{"id": e["id"], "name": e["name"], "department": e.get("department")} for e in target if e["id"] not in rmap]
    return {
        "notification": n, "counts": _notif_counts(resps, n["options"]), "options": n["options"],
        "target_count": len(target), "responded_count": len(responded),
        "response_rate": round(100 * len(responded) / len(target)) if target else 0,
        "responded": responded, "not_responded": not_responded,
    }


@api_router.delete("/notifications/{nid}")
async def delete_notification(nid: str):
    await db.notifications.delete_one({"id": nid})
    await db.notification_responses.delete_many({"notification_id": nid})
    return {"ok": True}


# ----------------------------- Faz 2: Hap Bilgi / İndirim / Yemekhane -----------------------------

class HapTopicCreate(BaseModel):
    name: str


class HapPostCreate(BaseModel):
    topic_id: Optional[str] = None
    title: str
    body: str = ""
    image: Optional[str] = None


class DiscCatCreate(BaseModel):
    name: str


class DiscountCreate(BaseModel):
    category_id: Optional[str] = None
    brand: str
    description: str = ""
    rate: str = ""
    contact: str = ""
    image: Optional[str] = None
    required_points: Optional[int] = None
    audience: Dict[str, Any] = Field(default_factory=lambda: {"all": True})


class Meal(BaseModel):
    name: str
    calorie: Optional[str] = None


class MenuDay(BaseModel):
    id: str = Field(default_factory=new_id)
    label: str
    meals: List[Meal] = []


class CanteenCreate(BaseModel):
    name: str
    audience: Dict[str, Any] = Field(default_factory=lambda: {"all": True})
    days: List[MenuDay] = []


class CanteenUpdate(BaseModel):
    name: Optional[str] = None
    audience: Optional[Dict[str, Any]] = None
    days: Optional[List[MenuDay]] = None


class LikePayload(BaseModel):
    employee_id: str


class ReactPayload(BaseModel):
    employee_id: str
    emoji: str


async def seed_phase2_cats():
    for kind, name, icon in [("hap_bilgi", "Hap Bilgi", "Lightbulb"), ("indirim", "İndirim & Ayrıcalıklar", "Percent"), ("yemekhane", "Yemekhane Listesi", "Utensils")]:
        if await db.categories.count_documents({"category_type": kind}) == 0:
            cnt = await db.categories.count_documents({})
            await db.categories.insert_one({
                "id": new_id(), "category_type": kind, "display_name": name, "icon": icon,
                "icon_image": None, "status": "active", "audience": Audience().model_dump(),
                "reporting_levels": ["sirket"], "content_type": "pasif", "pinnable": False,
                "order": cnt, "created_at": now_iso(),
            })


# ---- Hap Bilgi ----
@api_router.get("/hapbilgi/topics")
async def hap_topics():
    return await db.hap_topics.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@api_router.post("/hapbilgi/topics")
async def hap_topic_create(p: HapTopicCreate):
    doc = {"id": new_id(), "name": p.name}
    await db.hap_topics.insert_one(doc)
    return clean(doc)


@api_router.delete("/hapbilgi/topics/{tid}")
async def hap_topic_del(tid: str):
    await db.hap_topics.delete_one({"id": tid})
    return {"ok": True}


def _topic_name(topics, tid):
    return next((t["name"] for t in topics if t["id"] == tid), None)


@api_router.get("/hapbilgi/posts")
async def hap_posts():
    topics = await db.hap_topics.find({}, {"_id": 0}).to_list(1000)
    posts = await db.hap_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for p in posts:
        p["like_count"] = len(p.get("likes") or [])
        p["reaction_total"] = sum(len(v) for v in (p.get("reactions") or {}).values())
        p["topic_name"] = _topic_name(topics, p.get("topic_id"))
    return posts


@api_router.post("/hapbilgi/posts")
async def hap_post_create(p: HapPostCreate):
    doc = {"id": new_id(), **p.model_dump(), "likes": [], "reactions": {}, "created_at": now_iso()}
    await db.hap_posts.insert_one(doc)
    return clean(doc)


@api_router.delete("/hapbilgi/posts/{pid}")
async def hap_post_del(pid: str):
    await db.hap_posts.delete_one({"id": pid})
    return {"ok": True}


@api_router.get("/hapbilgi/feed")
async def hap_feed(employee_id: str, topic_id: Optional[str] = None):
    topics = await db.hap_topics.find({}, {"_id": 0}).to_list(1000)
    q = {"topic_id": topic_id} if topic_id else {}
    posts = await db.hap_posts.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for p in posts:
        reactions = p.get("reactions") or {}
        p["reactions_count"] = {k: len(v) for k, v in reactions.items()}
        p["my_reactions"] = [k for k, v in reactions.items() if employee_id in v]
        p["reaction_total"] = sum(len(v) for v in reactions.values())
        p["topic_name"] = _topic_name(topics, p.get("topic_id"))
    return posts


@api_router.post("/hapbilgi/posts/{pid}/react")
async def hap_react(pid: str, payload: ReactPayload):
    post = await db.hap_posts.find_one({"id": pid}, {"_id": 0})
    if not post:
        raise HTTPException(404, "İçerik bulunamadı")
    reactions = post.get("reactions") or {}
    arr = reactions.get(payload.emoji, [])
    if payload.employee_id in arr:
        arr.remove(payload.employee_id)
    else:
        arr.append(payload.employee_id)
    reactions[payload.emoji] = arr
    await db.hap_posts.update_one({"id": pid}, {"$set": {"reactions": reactions}})
    return {"reactions_count": {k: len(v) for k, v in reactions.items()}, "my_reactions": [k for k, v in reactions.items() if payload.employee_id in v]}


# ---- İndirim ----
@api_router.get("/discounts/categories")
async def disc_cats():
    return await db.disc_cats.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@api_router.post("/discounts/categories")
async def disc_cat_create(p: DiscCatCreate):
    doc = {"id": new_id(), "name": p.name}
    await db.disc_cats.insert_one(doc)
    return clean(doc)


@api_router.delete("/discounts/categories/{cid}")
async def disc_cat_del(cid: str):
    await db.disc_cats.delete_one({"id": cid})
    return {"ok": True}


@api_router.get("/discounts")
async def disc_list():
    cats = await db.disc_cats.find({}, {"_id": 0}).to_list(1000)
    items = await db.discounts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in items:
        d["category_name"] = next((c["name"] for c in cats if c["id"] == d.get("category_id")), None)
    return items


@api_router.post("/discounts")
async def disc_create(p: DiscountCreate):
    doc = {"id": new_id(), **p.model_dump(), "created_at": now_iso()}
    await db.discounts.insert_one(doc)
    return clean(doc)


@api_router.delete("/discounts/{did}")
async def disc_del(did: str):
    await db.discounts.delete_one({"id": did})
    return {"ok": True}


@api_router.get("/discounts/feed")
async def disc_feed(employee_id: str, category_id: Optional[str] = None):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    cats = await db.disc_cats.find({}, {"_id": 0}).to_list(1000)
    items = await db.discounts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for d in items:
        if category_id and d.get("category_id") != category_id:
            continue
        if not employee_matches(emp, d.get("audience")):
            continue
        # required_points sadece görünürlük eşiği; puan sistemi henüz yok => >0 gizli
        if d.get("required_points"):
            continue
        d["category_name"] = next((c["name"] for c in cats if c["id"] == d.get("category_id")), None)
        result.append(d)
    return result


# ---- Yemekhane ----
@api_router.get("/canteens")
async def canteen_list():
    return await db.canteens.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/canteens")
async def canteen_create(p: CanteenCreate):
    data = p.model_dump()
    data["days"] = [{"id": d.get("id") or new_id(), **{k: v for k, v in d.items() if k != "id"}} for d in data.get("days", [])]
    doc = {"id": new_id(), **data, "created_at": now_iso(), "updated_at": now_iso()}
    await db.canteens.insert_one(doc)
    return clean(doc)


@api_router.put("/canteens/{cid}")
async def canteen_update(cid: str, p: CanteenUpdate):
    update = {k: v for k, v in p.model_dump(exclude_none=True).items()}
    if "days" in update:
        update["days"] = [{"id": d.get("id") or new_id(), **{k: v for k, v in d.items() if k != "id"}} for d in update["days"]]
    update["updated_at"] = now_iso()
    res = await db.canteens.update_one({"id": cid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Yemekhane bulunamadı")
    return await db.canteens.find_one({"id": cid}, {"_id": 0})


@api_router.delete("/canteens/{cid}")
async def canteen_del(cid: str):
    await db.canteens.delete_one({"id": cid})
    return {"ok": True}


@api_router.get("/canteens/feed")
async def canteen_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    items = await db.canteens.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [c for c in items if employee_matches(emp, c.get("audience"))]


# ----------------------------- Faz 3a: İSG-Ramak Kala + Toplantı Odası -----------------------------

class IsgConfig(BaseModel):
    anonymity_mode: Optional[str] = None      # always_anon | always_open | user_choice
    status_flow_enabled: Optional[bool] = None
    tags: Optional[List[str]] = None


class RamakReportCreate(BaseModel):
    reporter_id: Optional[str] = None
    anonymous: bool = False
    tag: Optional[str] = None
    text: str
    image: Optional[str] = None


class RamakStatusUpdate(BaseModel):
    status: str


class RoomCreate(BaseModel):
    name: str
    location: str = ""
    capacity: Optional[int] = None
    equipment: str = ""
    approve_mode: str = "auto"                 # auto | approval
    audience: Dict[str, Any] = Field(default_factory=lambda: {"all": True})


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    equipment: Optional[str] = None
    approve_mode: Optional[str] = None
    audience: Optional[Dict[str, Any]] = None


class ReservationCreate(BaseModel):
    room_id: str
    employee_id: str
    date: str
    start: str
    end: str
    title: str = ""


async def seed_phase3a_cats():
    for kind, name, icon in [("isg_ramak", "İSG — Ramak Kala", "AlertTriangle"), ("toplanti_odasi", "Toplantı Odası", "DoorOpen")]:
        if await db.categories.count_documents({"category_type": kind}) == 0:
            cnt = await db.categories.count_documents({})
            await db.categories.insert_one({
                "id": new_id(), "category_type": kind, "display_name": name, "icon": icon,
                "icon_image": None, "status": "active", "audience": Audience().model_dump(),
                "reporting_levels": ["sirket", "organizasyon"], "content_type": "eylem",
                "pinnable": False, "order": cnt, "created_at": now_iso(),
            })
    if await db.isg_config.count_documents({}) == 0:
        await db.isg_config.insert_one({"id": "isg_ramak", "anonymity_mode": "user_choice", "status_flow_enabled": True, "tags": ["Kayma-Düşme", "Ekipman", "Yangın Riski"]})


# ---- İSG Ramak Kala ----
@api_router.get("/isg-ramak/config")
async def isg_get_config():
    cfg = await db.isg_config.find_one({"id": "isg_ramak"}, {"_id": 0})
    return cfg or {"id": "isg_ramak", "anonymity_mode": "user_choice", "status_flow_enabled": True, "tags": []}


@api_router.put("/isg-ramak/config")
async def isg_put_config(p: IsgConfig):
    update = {k: v for k, v in p.model_dump(exclude_none=True).items()}
    await db.isg_config.update_one({"id": "isg_ramak"}, {"$set": update}, upsert=True)
    return await db.isg_config.find_one({"id": "isg_ramak"}, {"_id": 0})


@api_router.post("/isg-ramak/reports")
async def ramak_create(p: RamakReportCreate):
    doc = {"id": new_id(), **p.model_dump(), "status": "yeni", "created_at": now_iso()}
    await db.ramak_reports.insert_one(doc)
    return clean(doc)


@api_router.get("/isg-ramak/reports")
async def ramak_list():
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    items = await db.ramak_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for r in items:
        r["reporter_name"] = None if r.get("anonymous") else (emps.get(r.get("reporter_id"), {}).get("name"))
        emp = emps.get(r.get("reporter_id"), {})
        r["department"] = None if r.get("anonymous") else emp.get("department")
        r["location"] = None if r.get("anonymous") else emp.get("location")
    return items


@api_router.put("/isg-ramak/reports/{rid}/status")
async def ramak_status(rid: str, p: RamakStatusUpdate):
    res = await db.ramak_reports.update_one({"id": rid}, {"$set": {"status": p.status}})
    if res.matched_count == 0:
        raise HTTPException(404, "Bildirim bulunamadı")
    return await db.ramak_reports.find_one({"id": rid}, {"_id": 0})


@api_router.get("/isg-ramak/my")
async def ramak_my(employee_id: str):
    return await db.ramak_reports.find({"reporter_id": employee_id, "anonymous": False}, {"_id": 0}).sort("created_at", -1).to_list(1000)


# ---- Toplantı Odası ----
@api_router.get("/rooms")
async def rooms_list():
    return await db.rooms.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/rooms")
async def room_create(p: RoomCreate):
    doc = {"id": new_id(), **p.model_dump(), "created_at": now_iso()}
    await db.rooms.insert_one(doc)
    return clean(doc)


@api_router.put("/rooms/{rid}")
async def room_update(rid: str, p: RoomUpdate):
    update = {k: v for k, v in p.model_dump(exclude_none=True).items()}
    res = await db.rooms.update_one({"id": rid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Oda bulunamadı")
    return await db.rooms.find_one({"id": rid}, {"_id": 0})


@api_router.delete("/rooms/{rid}")
async def room_delete(rid: str):
    await db.rooms.delete_one({"id": rid})
    await db.reservations.delete_many({"room_id": rid})
    return {"ok": True}


@api_router.get("/rooms/feed")
async def rooms_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    rooms = await db.rooms.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [r for r in rooms if employee_matches(emp, r.get("audience"))]


@api_router.get("/rooms/report")
async def rooms_report():
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(1000)
    rows = []
    for r in rooms:
        resv = await db.reservations.find({"room_id": r["id"], "status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(10000)
        rows.append({"id": r["id"], "name": r["name"], "reservations": len(resv)})
    return {"rooms": rows}


def _overlap(a_start, a_end, b_start, b_end):
    return a_start < b_end and a_end > b_start


@api_router.post("/reservations")
async def reservation_create(p: ReservationCreate):
    room = await db.rooms.find_one({"id": p.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Oda bulunamadı")
    same = await db.reservations.find({"room_id": p.room_id, "date": p.date, "status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(10000)
    for e in same:
        if _overlap(p.start, p.end, e["start"], e["end"]):
            raise HTTPException(400, "Bu oda seçilen saat aralığında dolu")
    status = "confirmed" if room.get("approve_mode", "auto") == "auto" else "pending"
    doc = {"id": new_id(), **p.model_dump(), "status": status, "created_at": now_iso()}
    await db.reservations.insert_one(doc)
    return clean(doc)


@api_router.get("/reservations")
async def reservation_list(room_id: Optional[str] = None, employee_id: Optional[str] = None, date: Optional[str] = None):
    q = {}
    if room_id:
        q["room_id"] = room_id
    if employee_id:
        q["employee_id"] = employee_id
    if date:
        q["date"] = date
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    rooms = {r["id"]: r for r in await db.rooms.find({}, {"_id": 0}).to_list(1000)}
    items = await db.reservations.find(q, {"_id": 0}).sort("date", 1).to_list(10000)
    for r in items:
        r["employee_name"] = emps.get(r.get("employee_id"), {}).get("name")
        r["room_name"] = rooms.get(r.get("room_id"), {}).get("name")
    return items


@api_router.post("/reservations/{resid}/cancel")
async def reservation_cancel(resid: str):
    await db.reservations.update_one({"id": resid}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


@api_router.put("/reservations/{resid}/status")
async def reservation_status(resid: str, p: RamakStatusUpdate):
    await db.reservations.update_one({"id": resid}, {"$set": {"status": p.status}})
    return await db.reservations.find_one({"id": resid}, {"_id": 0})


# ----------------------------- Faz 3b: Şirketin Enleri + Kutlama -----------------------------

class AwardCreate(BaseModel):
    name: str
    method: str = "manual"     # auto | manual | vote | hybrid
    period: str = "aylik"      # haftalik | aylik | ceyreklik


class WinnerCreate(BaseModel):
    employee_id: str
    period_label: str = ""


class VoteCreate(BaseModel):
    voter_id: str
    nominee_id: str


class TemplateCreate(BaseModel):
    subtype: str               # dogum_gunu | kidem | yeni_baslayan
    image: str


async def seed_phase3b_cats():
    for kind, name, icon in [("sirket_enleri", "Şirketin Enleri", "Star"), ("kutlama", "Kutlama", "PartyPopper")]:
        if await db.categories.count_documents({"category_type": kind}) == 0:
            cnt = await db.categories.count_documents({})
            await db.categories.insert_one({
                "id": new_id(), "category_type": kind, "display_name": name, "icon": icon,
                "icon_image": None, "status": "active", "audience": Audience().model_dump(),
                "reporting_levels": ["sirket"], "content_type": "pasif", "pinnable": False,
                "order": cnt, "created_at": now_iso(),
            })
    # mock doğum/işe giriş tarihleri
    emps = await db.employees.find({"birth_date": {"$exists": False}}, {"_id": 0}).to_list(1000)
    import random
    for i, e in enumerate(emps):
        bd = f"1990-{(i % 12) + 1:02d}-{(i % 27) + 1:02d}"
        hy = 2018 + (i % 7)
        hd = f"{hy}-{((i + 3) % 12) + 1:02d}-{((i + 5) % 27) + 1:02d}"
        await db.employees.update_one({"id": e["id"]}, {"$set": {"birth_date": bd, "hire_date": hd}})


# ---- Şirketin Enleri ----
@api_router.get("/awards")
async def awards_list():
    return await db.awards.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/awards")
async def award_create(p: AwardCreate):
    doc = {"id": new_id(), **p.model_dump(), "created_at": now_iso()}
    await db.awards.insert_one(doc)
    return clean(doc)


@api_router.delete("/awards/{aid}")
async def award_del(aid: str):
    await db.awards.delete_one({"id": aid})
    await db.award_winners.delete_many({"award_id": aid})
    await db.award_votes.delete_many({"award_id": aid})
    return {"ok": True}


@api_router.post("/awards/{aid}/winner")
async def award_winner(aid: str, p: WinnerCreate):
    doc = {"id": new_id(), "award_id": aid, **p.model_dump(), "created_at": now_iso()}
    await db.award_winners.insert_one(doc)
    return clean(doc)


@api_router.get("/awards/winners")
async def award_winners_list():
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    awards = {a["id"]: a for a in await db.awards.find({}, {"_id": 0}).to_list(1000)}
    rows = await db.award_winners.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for w in rows:
        emp = emps.get(w["employee_id"], {})
        w["employee_name"] = emp.get("name")
        w["avatar_url"] = emp.get("avatar_url")
        w["award_name"] = awards.get(w["award_id"], {}).get("name")
    return rows


@api_router.post("/awards/{aid}/vote")
async def award_vote(aid: str, p: VoteCreate):
    await db.award_votes.update_one({"award_id": aid, "voter_id": p.voter_id}, {"$set": {"nominee_id": p.nominee_id}, "$setOnInsert": {"id": new_id()}}, upsert=True)
    return {"ok": True}


@api_router.get("/awards/{aid}/votes")
async def award_votes(aid: str):
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    votes = await db.award_votes.find({"award_id": aid}, {"_id": 0}).to_list(10000)
    tally = {}
    for v in votes:
        tally.setdefault(v["nominee_id"], 0)
        tally[v["nominee_id"]] += 1
    return {"total": len(votes), "tally": [{"employee_id": k, "name": emps.get(k, {}).get("name"), "votes": n} for k, n in sorted(tally.items(), key=lambda x: -x[1])]}


# ---- Kutlama ----
@api_router.get("/celebration-templates")
async def tpl_list():
    return await db.cel_templates.find({}, {"_id": 0}).to_list(1000)


@api_router.post("/celebration-templates")
async def tpl_create(p: TemplateCreate):
    doc = {"id": new_id(), **p.model_dump(), "created_at": now_iso()}
    await db.cel_templates.insert_one(doc)
    return clean(doc)


@api_router.delete("/celebration-templates/{tid}")
async def tpl_del(tid: str):
    await db.cel_templates.delete_one({"id": tid})
    return {"ok": True}


@api_router.get("/celebrations/feed")
async def celebrations_feed():
    import random
    from datetime import date
    today = date.today()
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    tpls = await db.cel_templates.find({}, {"_id": 0}).to_list(1000)

    def tpl_for(sub):
        opts = [t["image"] for t in tpls if t["subtype"] == sub]
        return random.choice(opts) if opts else None

    out = []
    for e in emps:
        bd = e.get("birth_date")
        hd = e.get("hire_date")
        if bd and bd[5:7] == f"{today.month:02d}":
            out.append({"subtype": "dogum_gunu", "label": "Doğum Günü", "employee_name": e["name"], "avatar_url": e.get("avatar_url"), "detail": f"{bd[8:10]}.{bd[5:7]}", "image": tpl_for("dogum_gunu")})
        if hd and hd[5:7] == f"{today.month:02d}":
            years = today.year - int(hd[0:4])
            if years >= 1:
                out.append({"subtype": "kidem", "label": "Kıdem Kutlaması", "employee_name": e["name"], "avatar_url": e.get("avatar_url"), "detail": f"{years}. yıl", "image": tpl_for("kidem")})
            elif years == 0:
                out.append({"subtype": "yeni_baslayan", "label": "Yeni İşe Başlayan", "employee_name": e["name"], "avatar_url": e.get("avatar_url"), "detail": "Aramıza katıldı", "image": tpl_for("yeni_baslayan")})
    return out


# ----------------------------- Faz 4: Oyunlaştırma (Kudos + Rozet + Oyun) -----------------------------

GAMI_DEFAULTS = {
    "id": "gami",
    "kudos_moderation": False,
    "points": {"kudos_received": 10, "kudos_given": 2, "game_correct": 5, "game_perfect": 15},
    "kudos_values": [
        {"key": "takim", "label": "Takım Oyunu", "icon": "Users", "color": "sky"},
        {"key": "inovasyon", "label": "İnovasyon", "icon": "Lightbulb", "color": "amber"},
        {"key": "musteri", "label": "Müşteri Odaklılık", "icon": "Heart", "color": "rose"},
        {"key": "liderlik", "label": "Liderlik", "icon": "Flag", "color": "violet"},
        {"key": "guvenilirlik", "label": "Güvenilirlik", "icon": "Handshake", "color": "emerald"},
        {"key": "pozitif", "label": "Pozitif Enerji", "icon": "Sparkles", "color": "orange"},
    ],
}

LEVELS = [
    {"level": 1, "name": "Çaylak", "min": 0},
    {"level": 2, "name": "Çırak", "min": 50},
    {"level": 3, "name": "Kalfa", "min": 150},
    {"level": 4, "name": "Usta", "min": 300},
    {"level": 5, "name": "Uzman", "min": 500},
    {"level": 6, "name": "Şampiyon", "min": 800},
    {"level": 7, "name": "Efsane", "min": 1200},
]

BADGES = [
    {"code": "first_kudos", "name": "İlk Takdir", "description": "İlk kudos'unu ver", "icon": "Award", "type": "kudos_given", "threshold": 1},
    {"code": "generous", "name": "Cömert", "description": "10 kudos ver", "icon": "HeartHandshake", "type": "kudos_given", "threshold": 10},
    {"code": "appreciated", "name": "Takdir Edilen", "description": "5 kudos al", "icon": "Star", "type": "kudos_received", "threshold": 5},
    {"code": "star", "name": "Yıldız", "description": "20 kudos al", "icon": "Trophy", "type": "kudos_received", "threshold": 20},
    {"code": "player", "name": "Oyuncu", "description": "İlk oyununu oyna", "icon": "Gamepad2", "type": "games_played", "threshold": 1},
    {"code": "quizmaster", "name": "Bilgi Ustası", "description": "5 oyun tamamla", "icon": "Brain", "type": "games_played", "threshold": 5},
    {"code": "streak3", "name": "Seri Başı", "description": "3 gün üst üste aktif ol", "icon": "Flame", "type": "streak", "threshold": 3},
    {"code": "streak7", "name": "Kararlı", "description": "7 gün üst üste aktif ol", "icon": "Flame", "type": "streak", "threshold": 7},
    {"code": "point100", "name": "Yüzler Kulübü", "description": "100 puan topla", "icon": "Zap", "type": "total_points", "threshold": 100},
    {"code": "point500", "name": "Puan Avcısı", "description": "500 puan topla", "icon": "Rocket", "type": "total_points", "threshold": 500},
]


async def gami_config():
    cfg = await db.gami_config.find_one({"id": "gami"}, {"_id": 0}) or {}
    merged = {**GAMI_DEFAULTS, **cfg}
    return merged


async def award_points(employee_id, points, source, ref_id=None, note=""):
    if not points:
        return
    await db.points_ledger.insert_one({
        "id": new_id(), "employee_id": employee_id, "points": points,
        "source": source, "ref_id": ref_id, "note": note, "created_at": now_iso(),
    })


def level_for(total):
    cur = LEVELS[0]
    for l in LEVELS:
        if total >= l["min"]:
            cur = l
    nxt = next((l for l in LEVELS if l["min"] > total), None)
    return cur, nxt


async def employee_stats(employee_id):
    from datetime import date, timedelta
    ledger = await db.points_ledger.find({"employee_id": employee_id}, {"_id": 0}).to_list(100000)
    total = sum(x["points"] for x in ledger)
    kudos_received = await db.kudos.count_documents({"to_id": employee_id, "status": "published"})
    kudos_given = await db.kudos.count_documents({"from_id": employee_id, "status": "published"})
    games_played = await db.game_plays.count_documents({"employee_id": employee_id, "finished": True})
    dayset = {x["created_at"][:10] for x in ledger}
    streak = 0
    cursor = date.today()
    if cursor.isoformat() not in dayset:
        cursor = cursor - timedelta(days=1)  # seriyi dünden de sayabil
    while cursor.isoformat() in dayset:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return {"total_points": total, "kudos_received": kudos_received,
            "kudos_given": kudos_given, "games_played": games_played, "streak": streak}


def earned_badges(metrics):
    out = []
    for b in BADGES:
        val = metrics.get(b["type"], 0)
        out.append({**b, "earned": val >= b["threshold"], "current": val})
    return out


def _kudos_out(k, emps, values):
    frm = emps.get(k["from_id"], {})
    to = emps.get(k["to_id"], {})
    v = next((x for x in values if x["key"] == k["value"]), None)
    k["from_name"] = frm.get("name")
    k["from_avatar"] = frm.get("avatar")
    k["to_name"] = to.get("name")
    k["to_avatar"] = to.get("avatar")
    k["to_department"] = to.get("department")
    k["value_label"] = v["label"] if v else k["value"]
    k["value_icon"] = v["icon"] if v else "Award"
    k["value_color"] = v["color"] if v else "sky"
    return k


class KudosCreate(BaseModel):
    from_id: str
    to_id: str
    value: str
    message: str = ""


class GamiConfigUpdate(BaseModel):
    kudos_moderation: Optional[bool] = None
    kudos_values: Optional[List[Dict[str, Any]]] = None
    points: Optional[Dict[str, int]] = None


class GameQuestion(BaseModel):
    id: str = Field(default_factory=new_id)
    text: str
    options: List[str] = []
    correct_index: int = 0


class GameCreate(BaseModel):
    title: str
    description: str = ""
    questions: List[GameQuestion] = []
    time_limit: int = 20
    status: str = "active"
    is_tournament: bool = False
    period: str = "aylik"


class GameUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    questions: Optional[List[GameQuestion]] = None
    time_limit: Optional[int] = None
    status: Optional[str] = None
    is_tournament: Optional[bool] = None
    period: Optional[str] = None


class GamePlay(BaseModel):
    employee_id: str
    answers: List[int] = []


async def seed_phase4():
    for kind, name, icon in [("kudos", "Kudos", "Award"), ("rozet", "Rozet / Oyunlaştırma", "Trophy"), ("oyun", "Oyun", "Gamepad2")]:
        if await db.categories.count_documents({"category_type": kind}) == 0:
            cnt = await db.categories.count_documents({})
            await db.categories.insert_one({
                "id": new_id(), "category_type": kind, "display_name": name, "icon": icon,
                "icon_image": None, "status": "active", "audience": Audience().model_dump(),
                "reporting_levels": ["sirket", "kisi"], "content_type": "eylem", "pinnable": False,
                "order": cnt, "created_at": now_iso(),
            })
    if await db.gami_config.count_documents({}) == 0:
        await db.gami_config.insert_one({**GAMI_DEFAULTS})
    if await db.kudos.count_documents({}) == 0:
        emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
        if len(emps) >= 6:
            samples = [
                (emps[2], emps[3], "takim", "Proje tesliminde harika bir ekip çalışması gösterdin!"),
                (emps[4], emps[2], "inovasyon", "Getirdiğin yeni fikir tüm süreci hızlandırdı."),
                (emps[3], emps[5], "pozitif", "Enerjin tüm ofise ilham veriyor."),
                (emps[5], emps[4], "guvenilirlik", "Her zaman güvenebileceğimiz birisin."),
                (emps[2], emps[4], "liderlik", "Zor bir günde ekibe liderlik ettin."),
            ]
            pts = GAMI_DEFAULTS["points"]
            for frm, to, val, msg in samples:
                kid = new_id()
                await db.kudos.insert_one({"id": kid, "from_id": frm["id"], "to_id": to["id"], "value": val,
                                           "message": msg, "status": "published", "created_at": now_iso()})
                await award_points(to["id"], pts["kudos_received"], "kudos_received", kid, f"{frm['name']} tarafından")
                await award_points(frm["id"], pts["kudos_given"], "kudos_given", kid, f"{to['name']} için")
    if await db.games.count_documents({}) == 0:
        await db.games.insert_one({
            "id": new_id(), "title": "Şirket Kültürü Bilgi Yarışması",
            "description": "Şirketimizi ne kadar tanıyorsun? Kısa bir quiz ile test et!",
            "questions": [
                {"id": new_id(), "text": "Şirketimizin merkez ofisi hangi şehirde?", "options": ["İstanbul", "Ankara", "İzmir", "Bursa"], "correct_index": 0},
                {"id": new_id(), "text": "Haftalık nabız (pulse) anketinin amacı nedir?", "options": ["Ceza vermek", "Çalışan bağlılığını ölçmek", "İzin takibi", "Maaş hesabı"], "correct_index": 1},
                {"id": new_id(), "text": "Ramak kala bildirimi ne için kullanılır?", "options": ["İzin talebi", "İş güvenliği riskleri", "Yemek menüsü", "Etkinlik daveti"], "correct_index": 1},
            ],
            "time_limit": 20, "status": "active", "is_tournament": True, "period": "aylik",
            "created_at": now_iso(), "updated_at": now_iso(),
        })


# ---- Gamification config / leaderboard / profile ----
@api_router.get("/gami/config")
async def get_gami_config():
    return await gami_config()


@api_router.put("/gami/config")
async def update_gami_config(p: GamiConfigUpdate):
    update = {k: v for k, v in p.model_dump(exclude_none=True).items()}
    await db.gami_config.update_one({"id": "gami"}, {"$set": update}, upsert=True)
    return await gami_config()


@api_router.get("/gami/leaderboard")
async def gami_leaderboard():
    emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
    rows = []
    for e in emps:
        m = await employee_stats(e["id"])
        cur, _ = level_for(m["total_points"])
        badges = [b for b in earned_badges(m) if b["earned"]]
        rows.append({"employee_id": e["id"], "name": e["name"], "department": e.get("department"),
                     "avatar": e.get("avatar"), "points": m["total_points"], "level": cur["level"],
                     "level_name": cur["name"], "badge_count": len(badges), "streak": m["streak"]})
    rows.sort(key=lambda x: -x["points"])
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return rows


@api_router.get("/gami/profile")
async def gami_profile(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    m = await employee_stats(employee_id)
    cur, nxt = level_for(m["total_points"])
    if nxt:
        span = nxt["min"] - cur["min"]
        progress = round(100 * (m["total_points"] - cur["min"]) / span) if span else 100
        to_next = nxt["min"] - m["total_points"]
    else:
        progress, to_next = 100, 0
    ledger = await db.points_ledger.find({"employee_id": employee_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    lb = await gami_leaderboard()
    rank = next((r["rank"] for r in lb if r["employee_id"] == employee_id), None)
    return {
        "employee": {"id": emp["id"], "name": emp["name"], "department": emp.get("department"), "avatar": emp.get("avatar")},
        "metrics": m, "level": cur, "next_level": nxt, "progress": progress, "to_next": to_next,
        "badges": earned_badges(m), "history": ledger, "rank": rank, "total_people": len(lb),
    }


# ---- Kudos ----
@api_router.post("/kudos")
async def create_kudos(p: KudosCreate):
    if p.from_id == p.to_id:
        raise HTTPException(400, "Kendine kudos veremezsin")
    cfg = await gami_config()
    if not any(v["key"] == p.value for v in cfg["kudos_values"]):
        raise HTTPException(400, "Geçersiz değer")
    status = "pending" if cfg.get("kudos_moderation") else "published"
    doc = {"id": new_id(), "from_id": p.from_id, "to_id": p.to_id, "value": p.value,
           "message": p.message, "status": status, "created_at": now_iso()}
    await db.kudos.insert_one(doc)
    if status == "published":
        await award_points(p.to_id, cfg["points"]["kudos_received"], "kudos_received", doc["id"])
        await award_points(p.from_id, cfg["points"]["kudos_given"], "kudos_given", doc["id"])
    return {**clean(doc), "moderated": status == "pending"}


@api_router.get("/kudos/feed")
async def kudos_feed():
    cfg = await gami_config()
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    items = await db.kudos.find({"status": "published"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [_kudos_out(k, emps, cfg["kudos_values"]) for k in items]


@api_router.get("/kudos/mine")
async def kudos_mine(employee_id: str):
    cfg = await gami_config()
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    received = await db.kudos.find({"to_id": employee_id, "status": "published"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    given = await db.kudos.find({"from_id": employee_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"received": [_kudos_out(k, emps, cfg["kudos_values"]) for k in received],
            "given": [_kudos_out(k, emps, cfg["kudos_values"]) for k in given]}


@api_router.get("/kudos/pending")
async def kudos_pending():
    cfg = await gami_config()
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    items = await db.kudos.find({"status": "pending"}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [_kudos_out(k, emps, cfg["kudos_values"]) for k in items]


@api_router.post("/kudos/{kid}/approve")
async def kudos_approve(kid: str):
    k = await db.kudos.find_one({"id": kid}, {"_id": 0})
    if not k:
        raise HTTPException(404, "Kudos bulunamadı")
    if k["status"] != "published":
        cfg = await gami_config()
        await db.kudos.update_one({"id": kid}, {"$set": {"status": "published"}})
        await award_points(k["to_id"], cfg["points"]["kudos_received"], "kudos_received", kid)
        await award_points(k["from_id"], cfg["points"]["kudos_given"], "kudos_given", kid)
    return {"ok": True}


@api_router.post("/kudos/{kid}/reject")
async def kudos_reject(kid: str):
    await db.kudos.update_one({"id": kid}, {"$set": {"status": "rejected"}})
    return {"ok": True}


@api_router.delete("/kudos/{kid}")
async def kudos_delete(kid: str):
    await db.kudos.delete_one({"id": kid})
    await db.points_ledger.delete_many({"ref_id": kid})
    return {"ok": True}


# ---- Oyun (Quiz) ----
@api_router.get("/games")
async def games_list():
    items = await db.games.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for g in items:
        g["play_count"] = await db.game_plays.count_documents({"game_id": g["id"], "finished": True})
        g["question_count"] = len(g.get("questions", []))
    return items


@api_router.post("/games")
async def game_create(p: GameCreate):
    if len(p.questions) < 1:
        raise HTTPException(400, "En az 1 soru gerekli")
    data = p.model_dump()
    data["questions"] = [{"id": q.get("id") or new_id(), **{k: v for k, v in q.items() if k != "id"}} for q in data["questions"]]
    doc = {"id": new_id(), **data, "created_at": now_iso(), "updated_at": now_iso()}
    await db.games.insert_one(doc)
    return clean(doc)


@api_router.put("/games/{gid}")
async def game_update(gid: str, p: GameUpdate):
    update = {k: v for k, v in p.model_dump(exclude_none=True).items()}
    if "questions" in update:
        update["questions"] = [{"id": q.get("id") or new_id(), **{k: v for k, v in q.items() if k != "id"}} for q in update["questions"]]
    update["updated_at"] = now_iso()
    res = await db.games.update_one({"id": gid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Oyun bulunamadı")
    return await db.games.find_one({"id": gid}, {"_id": 0})


@api_router.delete("/games/{gid}")
async def game_delete(gid: str):
    await db.games.delete_one({"id": gid})
    await db.game_plays.delete_many({"game_id": gid})
    return {"ok": True}


@api_router.get("/games/feed")
async def games_feed(employee_id: str):
    items = await db.games.find({"status": "active"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for g in items:
        play = await db.game_plays.find_one({"game_id": g["id"], "employee_id": employee_id, "finished": True}, {"_id": 0})
        result.append({
            "id": g["id"], "title": g["title"], "description": g.get("description", ""),
            "question_count": len(g.get("questions", [])), "time_limit": g.get("time_limit", 20),
            "is_tournament": g.get("is_tournament", False), "period": g.get("period"),
            "played": bool(play), "my_score": play["score"] if play else None,
            "my_correct": play["correct_count"] if play else None,
        })
    return result


@api_router.get("/games/{gid}/play")
async def game_play_data(gid: str, employee_id: str):
    game = await db.games.find_one({"id": gid}, {"_id": 0})
    if not game:
        raise HTTPException(404, "Oyun bulunamadı")
    played = await db.game_plays.find_one({"game_id": gid, "employee_id": employee_id, "finished": True}, {"_id": 0})
    qs = [{"id": q["id"], "text": q["text"], "options": q["options"]} for q in game.get("questions", [])]
    return {"id": game["id"], "title": game["title"], "description": game.get("description", ""),
            "time_limit": game.get("time_limit", 20), "questions": qs,
            "already_played": bool(played), "my_result": played}


@api_router.post("/games/{gid}/play")
async def play_game(gid: str, p: GamePlay):
    game = await db.games.find_one({"id": gid}, {"_id": 0})
    if not game:
        raise HTTPException(404, "Oyun bulunamadı")
    if await db.game_plays.find_one({"game_id": gid, "employee_id": p.employee_id, "finished": True}):
        raise HTTPException(400, "Bu oyunu zaten oynadın")
    qs = game.get("questions", [])
    correct = sum(1 for i, q in enumerate(qs) if i < len(p.answers) and p.answers[i] == q["correct_index"])
    cfg = await gami_config()
    pts = correct * cfg["points"]["game_correct"]
    perfect = correct == len(qs) and len(qs) > 0
    if perfect:
        pts += cfg["points"]["game_perfect"]
    await db.game_plays.insert_one({
        "id": new_id(), "game_id": gid, "employee_id": p.employee_id, "answers": p.answers,
        "correct_count": correct, "total": len(qs), "score": pts, "perfect": perfect,
        "finished": True, "played_at": now_iso(),
    })
    await award_points(p.employee_id, pts, "game", gid, f"{game['title']} · {correct}/{len(qs)} doğru")
    return {"correct_count": correct, "total": len(qs), "score": pts, "perfect": perfect,
            "correct_indexes": [q["correct_index"] for q in qs]}


@api_router.get("/games/{gid}/leaderboard")
async def game_leaderboard(gid: str):
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    plays = await db.game_plays.find({"game_id": gid, "finished": True}, {"_id": 0}).to_list(10000)
    plays.sort(key=lambda x: (-x["score"], x["played_at"]))
    rows = []
    for i, pl in enumerate(plays):
        e = emps.get(pl["employee_id"], {})
        rows.append({"rank": i + 1, "employee_id": pl["employee_id"], "name": e.get("name"),
                     "avatar": e.get("avatar"), "score": pl["score"], "correct": pl["correct_count"],
                     "total": pl["total"], "perfect": pl.get("perfect", False)})
    return rows


# ----------------------------- Faz 5: Topluluk + Kudos Bildirim -----------------------------

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, cid: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(cid, []).append(ws)

    def disconnect(self, cid: str, ws: WebSocket):
        if cid in self.active and ws in self.active[cid]:
            self.active[cid].remove(ws)

    async def broadcast(self, cid: str, message: dict):
        for ws in list(self.active.get(cid, [])):
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


class CommunityCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "Users"
    color: str = "sky"
    audience: Dict[str, Any] = Field(default_factory=lambda: {"all": True})
    status: str = "active"


class CommunityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    audience: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class ExpertToggle(BaseModel):
    employee_id: str


class PostCreate(BaseModel):
    author_id: str
    type: str = "tartisma"      # tartisma | anket
    title: str
    body: str = ""
    options: List[str] = []     # anket için seçenek metinleri


class CommentCreate(BaseModel):
    author_id: str
    body: str


class VotePayload(BaseModel):
    employee_id: str
    option_id: str


class MessageCreate(BaseModel):
    author_id: str
    text: str


def _emp_brief(emps, eid, experts=()):
    e = emps.get(eid, {})
    return {"id": eid, "name": e.get("name"), "avatar": e.get("avatar"),
            "department": e.get("department"), "is_expert": eid in experts}


def _post_out(p, emps, experts):
    p["author"] = _emp_brief(emps, p["author_id"], experts)
    for c in p.get("comments", []):
        c["author"] = _emp_brief(emps, c["author_id"], experts)
    p["comment_count"] = len(p.get("comments", []))
    if p.get("type") == "anket":
        total = sum(len(o.get("votes", [])) for o in p.get("options", []))
        for o in p.get("options", []):
            o["count"] = len(o.get("votes", []))
            o["percent"] = round(100 * o["count"] / total) if total else 0
        p["total_votes"] = total
    return p


async def seed_phase5():
    if await db.categories.count_documents({"category_type": "topluluk"}) == 0:
        cnt = await db.categories.count_documents({})
        await db.categories.insert_one({
            "id": new_id(), "category_type": "topluluk", "display_name": "Topluluk", "icon": "Users",
            "icon_image": None, "status": "active", "audience": Audience().model_dump(),
            "reporting_levels": ["sirket"], "content_type": "eylem", "pinnable": False,
            "order": cnt, "created_at": now_iso(),
        })
    if await db.communities.count_documents({}) == 0:
        emps = await db.employees.find({}, {"_id": 0}).to_list(1000)
        if len(emps) >= 6:
            defs = [
                {"name": "Yazılım & Teknoloji", "description": "Kod, araçlar ve teknoloji sohbetleri.", "icon": "Code", "color": "violet", "expert": emps[4]["id"]},
                {"name": "Spor & Sağlık", "description": "Koşu, yoga ve sağlıklı yaşam.", "icon": "Dumbbell", "color": "emerald", "expert": emps[2]["id"]},
            ]
            for d in defs:
                cid = new_id()
                await db.communities.insert_one({
                    "id": cid, "name": d["name"], "description": d["description"], "icon": d["icon"],
                    "color": d["color"], "audience": Audience().model_dump(), "status": "active",
                    "experts": [d["expert"]], "created_at": now_iso(),
                })
                if d["name"].startswith("Yazılım"):
                    pid = new_id()
                    await db.community_posts.insert_one({
                        "id": pid, "community_id": cid, "author_id": emps[5]["id"], "type": "tartisma",
                        "title": "En sevdiğiniz kod editörü hangisi?", "body": "Günlük iş akışınızda hangi editörü kullanıyorsunuz ve neden?",
                        "options": [], "pinned": True,
                        "comments": [{"id": new_id(), "author_id": emps[4]["id"], "body": "VS Code + eklentiler benim için ideal.", "verified": True, "created_at": now_iso()}],
                        "created_at": now_iso(),
                    })
                    await db.community_posts.insert_one({
                        "id": new_id(), "community_id": cid, "author_id": emps[4]["id"], "type": "anket",
                        "title": "Bir sonraki tech-talk konusu ne olsun?", "body": "",
                        "options": [{"id": new_id(), "text": "Yapay Zeka", "votes": [emps[5]["id"], emps[2]["id"]]},
                                    {"id": new_id(), "text": "Güvenlik", "votes": [emps[3]["id"]]},
                                    {"id": new_id(), "text": "DevOps", "votes": []}],
                        "pinned": False, "comments": [], "created_at": now_iso(),
                    })
                    await db.community_messages.insert_one({"id": new_id(), "community_id": cid, "author_id": emps[5]["id"], "text": "Herkese merhaba! 👋", "created_at": now_iso()})
                    await db.community_messages.insert_one({"id": new_id(), "community_id": cid, "author_id": emps[4]["id"], "text": "Hoş geldiniz, buradayız!", "created_at": now_iso()})


# ---- Communities ----
@api_router.get("/communities")
async def communities_list():
    items = await db.communities.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for c in items:
        c["post_count"] = await db.community_posts.count_documents({"community_id": c["id"]})
        c["member_hint"] = len(c.get("experts", []))
    return items


@api_router.get("/communities/feed")
async def communities_feed(employee_id: str):
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    items = await db.communities.find({"status": "active"}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    result = []
    for c in items:
        if employee_matches(emp, c.get("audience")):
            c["post_count"] = await db.community_posts.count_documents({"community_id": c["id"]})
            c["is_expert"] = employee_id in c.get("experts", [])
            result.append(c)
    return result


@api_router.post("/communities")
async def community_create(p: CommunityCreate):
    doc = {"id": new_id(), **p.model_dump(), "experts": [], "created_at": now_iso()}
    await db.communities.insert_one(doc)
    return clean(doc)


@api_router.get("/communities/{cid}")
async def community_get(cid: str):
    doc = await db.communities.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Topluluk bulunamadı")
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    doc["expert_people"] = [_emp_brief(emps, eid, doc.get("experts", [])) for eid in doc.get("experts", [])]
    return doc


@api_router.put("/communities/{cid}")
async def community_update(cid: str, p: CommunityUpdate):
    update = {k: v for k, v in p.model_dump(exclude_none=True).items()}
    res = await db.communities.update_one({"id": cid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Topluluk bulunamadı")
    return await db.communities.find_one({"id": cid}, {"_id": 0})


@api_router.delete("/communities/{cid}")
async def community_delete(cid: str):
    await db.communities.delete_one({"id": cid})
    await db.community_posts.delete_many({"community_id": cid})
    await db.community_messages.delete_many({"community_id": cid})
    return {"ok": True}


@api_router.post("/communities/{cid}/expert")
async def community_expert(cid: str, p: ExpertToggle):
    c = await db.communities.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Topluluk bulunamadı")
    experts = c.get("experts", [])
    if p.employee_id in experts:
        experts.remove(p.employee_id)
    else:
        experts.append(p.employee_id)
    await db.communities.update_one({"id": cid}, {"$set": {"experts": experts}})
    return {"ok": True, "experts": experts}


# ---- Posts ----
@api_router.get("/communities/{cid}/posts")
async def community_posts(cid: str):
    c = await db.communities.find_one({"id": cid}, {"_id": 0})
    experts = c.get("experts", []) if c else []
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    posts = await db.community_posts.find({"community_id": cid}, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(1000)
    return [_post_out(p, emps, experts) for p in posts]


@api_router.post("/communities/{cid}/posts")
async def post_create(cid: str, p: PostCreate):
    options = [{"id": new_id(), "text": t, "votes": []} for t in p.options] if p.type == "anket" else []
    if p.type == "anket" and len(options) < 2:
        raise HTTPException(400, "Anket için en az 2 seçenek gerekli")
    doc = {"id": new_id(), "community_id": cid, "author_id": p.author_id, "type": p.type,
           "title": p.title, "body": p.body, "options": options, "pinned": False,
           "comments": [], "created_at": now_iso()}
    await db.community_posts.insert_one(doc)
    author = await db.employees.find_one({"id": p.author_id}, {"_id": 0})
    aname = (author or {}).get("name", "Bir çalışan")
    label = "anket" if p.type == "anket" else "tartışma"
    await notify_experts(cid, p.author_id, "post", f"{aname} yeni bir {label} paylaştı: {p.title}", doc["id"])
    return clean(doc)


@api_router.post("/posts/{pid}/comment")
async def post_comment(pid: str, p: CommentCreate):
    comment = {"id": new_id(), "author_id": p.author_id, "body": p.body, "verified": False, "created_at": now_iso()}
    res = await db.community_posts.update_one({"id": pid}, {"$push": {"comments": comment}})
    if res.matched_count == 0:
        raise HTTPException(404, "Gönderi bulunamadı")
    post = await db.community_posts.find_one({"id": pid}, {"_id": 0})
    author = await db.employees.find_one({"id": p.author_id}, {"_id": 0})
    aname = (author or {}).get("name", "Bir çalışan")
    if post:
        await notify_experts(post["community_id"], p.author_id, "comment", f"{aname} bir gönderiye yorum yaptı: {p.body[:50]}", pid)
    return {"ok": True, "comment": comment}


@api_router.post("/posts/{pid}/vote")
async def post_vote(pid: str, p: VotePayload):
    post = await db.community_posts.find_one({"id": pid}, {"_id": 0})
    if not post or post.get("type") != "anket":
        raise HTTPException(404, "Anket bulunamadı")
    options = post.get("options", [])
    for o in options:
        o["votes"] = [v for v in o.get("votes", []) if v != p.employee_id]
    for o in options:
        if o["id"] == p.option_id:
            o["votes"].append(p.employee_id)
    await db.community_posts.update_one({"id": pid}, {"$set": {"options": options}})
    return {"ok": True}


@api_router.post("/posts/{pid}/pin")
async def post_pin(pid: str):
    post = await db.community_posts.find_one({"id": pid}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Gönderi bulunamadı")
    await db.community_posts.update_one({"id": pid}, {"$set": {"pinned": not post.get("pinned", False)}})
    return {"ok": True}


@api_router.post("/posts/{pid}/comments/{coid}/verify")
async def comment_verify(pid: str, coid: str):
    post = await db.community_posts.find_one({"id": pid}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Gönderi bulunamadı")
    comments = post.get("comments", [])
    for c in comments:
        if c["id"] == coid:
            c["verified"] = not c.get("verified", False)
    await db.community_posts.update_one({"id": pid}, {"$set": {"comments": comments}})
    return {"ok": True}


@api_router.delete("/posts/{pid}")
async def post_delete(pid: str):
    await db.community_posts.delete_one({"id": pid})
    return {"ok": True}


@api_router.delete("/posts/{pid}/comments/{coid}")
async def comment_delete(pid: str, coid: str):
    await db.community_posts.update_one({"id": pid}, {"$pull": {"comments": {"id": coid}}})
    return {"ok": True}


# ---- Chat messages ----
def _msg_out(m, emps, experts):
    m["author"] = _emp_brief(emps, m["author_id"], experts)
    return m


@api_router.get("/communities/{cid}/messages")
async def messages_list(cid: str, after: Optional[str] = None):
    c = await db.communities.find_one({"id": cid}, {"_id": 0})
    experts = c.get("experts", []) if c else []
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    q = {"community_id": cid}
    if after:
        q["created_at"] = {"$gt": after}
    msgs = await db.community_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(2000)
    return [_msg_out(m, emps, experts) for m in msgs]


@api_router.post("/communities/{cid}/messages")
async def message_create(cid: str, p: MessageCreate):
    c = await db.communities.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Topluluk bulunamadı")
    emp = await db.employees.find_one({"id": p.author_id}, {"_id": 0})
    doc = {"id": new_id(), "community_id": cid, "author_id": p.author_id, "text": p.text, "created_at": now_iso()}
    await db.community_messages.insert_one(doc)
    out = {**clean(doc), "author": _emp_brief({p.author_id: emp or {}}, p.author_id, c.get("experts", []))}
    await manager.broadcast(cid, {"kind": "message", "data": out})
    return out


@api_router.delete("/messages/{mid}")
async def message_delete(mid: str):
    await db.community_messages.delete_one({"id": mid})
    return {"ok": True}


@api_router.websocket("/ws/community/{cid}")
async def community_ws(ws: WebSocket, cid: str):
    await manager.connect(cid, ws)
    try:
        while True:
            data = await ws.receive_json()
            author_id = data.get("author_id")
            text = (data.get("text") or "").strip()
            if not author_id or not text:
                continue
            c = await db.communities.find_one({"id": cid}, {"_id": 0})
            emp = await db.employees.find_one({"id": author_id}, {"_id": 0})
            doc = {"id": new_id(), "community_id": cid, "author_id": author_id, "text": text, "created_at": now_iso()}
            await db.community_messages.insert_one(doc)
            out = {**clean(doc), "author": _emp_brief({author_id: emp or {}}, author_id, (c or {}).get("experts", []))}
            await manager.broadcast(cid, {"kind": "message", "data": out})
    except WebSocketDisconnect:
        manager.disconnect(cid, ws)
    except Exception:
        manager.disconnect(cid, ws)


# ---- Kudos bildirimleri ----
@api_router.get("/kudos/notifications")
async def kudos_notifications(employee_id: str):
    cfg = await gami_config()
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    items = await db.kudos.find({"to_id": employee_id, "status": "published", "seen_by_recipient": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"count": len(items), "items": [_kudos_out(k, emps, cfg["kudos_values"]) for k in items]}


@api_router.post("/kudos/notifications/seen")
async def kudos_notifications_seen(p: LikePayload):
    await db.kudos.update_many({"to_id": p.employee_id, "status": "published"}, {"$set": {"seen_by_recipient": True}})
    return {"ok": True}


# ---- Bildirim kutusu (Kudos + Topluluk uzman bildirimleri) + Profil ----
async def notify_experts(community_id, actor_id, kind, text, post_id=None):
    c = await db.communities.find_one({"id": community_id}, {"_id": 0})
    if not c:
        return
    for eid in c.get("experts", []):
        if eid == actor_id:
            continue
        await db.user_notifications.insert_one({
            "id": new_id(), "employee_id": eid, "type": "community", "kind": kind,
            "community_id": community_id, "community_name": c.get("name"),
            "post_id": post_id, "text": text, "seen": False, "created_at": now_iso(),
        })


@api_router.get("/notifications/inbox")
async def notifications_inbox(employee_id: str):
    cfg = await gami_config()
    emps = {e["id"]: e for e in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    items = []
    kud = await db.kudos.find({"to_id": employee_id, "status": "published", "seen_by_recipient": {"$ne": True}}, {"_id": 0}).to_list(100)
    for k in kud:
        v = next((x for x in cfg["kudos_values"] if x["key"] == k["value"]), None)
        frm = emps.get(k["from_id"], {})
        items.append({"id": "kudos:" + k["id"], "icon": (v or {}).get("icon", "Award"),
                      "text": f"{frm.get('name')} sana {(v or {}).get('label', k['value'])} kudos'u verdi 🎉",
                      "sub": k.get("message"), "link": "/ic-iletisim/kudos", "created_at": k["created_at"]})
    un = await db.user_notifications.find({"employee_id": employee_id, "seen": {"$ne": True}}, {"_id": 0}).to_list(200)
    for n in un:
        items.append({"id": "un:" + n["id"], "icon": "MessageSquare" if n.get("kind") == "comment" else "MessagesSquare",
                      "text": n.get("text"), "sub": n.get("community_name"),
                      "link": f"/ic-iletisim/topluluk/{n.get('community_id')}", "created_at": n["created_at"]})
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return {"count": len(items), "items": items}


@api_router.post("/notifications/inbox/seen")
async def notifications_inbox_seen(p: LikePayload):
    await db.kudos.update_many({"to_id": p.employee_id, "status": "published"}, {"$set": {"seen_by_recipient": True}})
    await db.user_notifications.update_many({"employee_id": p.employee_id}, {"$set": {"seen": True}})
    return {"ok": True}


@api_router.get("/profile/{eid}")
async def user_profile(eid: str):
    emp = await db.employees.find_one({"id": eid}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "Çalışan bulunamadı")
    m = await employee_stats(eid)
    cur, nxt = level_for(m["total_points"])
    if nxt:
        span = nxt["min"] - cur["min"]
        progress = round(100 * (m["total_points"] - cur["min"]) / span) if span else 100
        to_next = nxt["min"] - m["total_points"]
    else:
        progress, to_next = 100, 0
    lb = await gami_leaderboard()
    rank = next((r["rank"] for r in lb if r["employee_id"] == eid), None)
    comms = await db.communities.find({"experts": eid}, {"_id": 0}).to_list(1000)
    expert_in = [{"id": c["id"], "name": c["name"], "icon": c.get("icon"), "color": c.get("color")} for c in comms]
    reg = await db.route_registrations.find_one({"employee_id": eid}, {"_id": 0})
    route_info = None
    if reg:
        route = await db.routes.find_one({"id": reg.get("route_id")}, {"_id": 0})
        if route:
            stop = next((s for s in route.get("stops", []) if s.get("id") == reg.get("stop_id")), None)
            route_info = {"route_name": route.get("name"), "stop_name": (stop or {}).get("name"),
                          "time": (stop or {}).get("time"), "direction": route.get("direction")}
    activity = []
    acfg = await gami_config()
    amap = {e2["id"]: e2 for e2 in await db.employees.find({}, {"_id": 0}).to_list(1000)}
    for k in await db.kudos.find({"to_id": eid, "status": "published"}, {"_id": 0}).sort("created_at", -1).to_list(20):
        v = next((x for x in acfg["kudos_values"] if x["key"] == k["value"]), None)
        activity.append({"type": "kudos", "icon": (v or {}).get("icon", "Award"),
                         "text": f"{amap.get(k['from_id'], {}).get('name', 'Biri')}'ten {(v or {}).get('label', k['value'])} kudos'u aldı",
                         "sub": k.get("message"), "date": k["created_at"]})
    for pl in await db.game_plays.find({"employee_id": eid, "finished": True}, {"_id": 0}).sort("played_at", -1).to_list(20):
        g = await db.games.find_one({"id": pl["game_id"]}, {"_id": 0})
        activity.append({"type": "game", "icon": "Gamepad2",
                         "text": f"{(g or {}).get('title', 'Bir oyun')} oyununu oynadı",
                         "sub": f"{pl['correct_count']}/{pl['total']} doğru · +{pl['score']} puan", "date": pl["played_at"]})
    for pp in await db.community_posts.find({"type": "anket", "options.votes": eid}, {"_id": 0}).to_list(50):
        activity.append({"type": "poll", "icon": "BarChart3",
                         "text": f"\"{pp['title']}\" anketinde oy kullandı", "sub": None, "date": pp.get("created_at")})
    activity = sorted([a for a in activity if a.get("date")], key=lambda x: x["date"], reverse=True)[:15]
    return {"employee": {"id": emp["id"], "name": emp.get("name"), "department": emp.get("department"),
                         "location": emp.get("location"), "title": emp.get("title"), "seniority": emp.get("seniority"),
                         "avatar": emp.get("avatar"), "email": emp.get("email"), "phone": emp.get("phone")},
            "metrics": m, "level": cur, "next_level": nxt, "progress": progress, "to_next": to_next,
            "badges": earned_badges(m), "rank": rank, "total_people": len(lb),
            "expert_in": expert_in, "route": route_info, "activity": activity}


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
    await seed_audiences_if_empty()
    await seed_notification_cats()
    await seed_phase2_cats()
    await seed_phase3a_cats()
    await seed_phase3b_cats()
    await seed_phase4()
    await seed_phase5()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
