# ตารางเรียน — ฟิสิกส์อุตสาหกรรมและวิศวกรรมไอโอที (KMITL)

เว็บแอพตารางเรียนภาควิชาฟิสิกส์อุตสาหกรรมและวิศวกรรมไอโอที KMITL **ภาคเรียนที่ 1/2569**
มาพร้อม **ตารางฟิกรายสัปดาห์ตลอดเทอม** (จันทร์–อาทิตย์) + **ตารางสอบกลางภาค/ปลายภาค**
เพิ่ม/ลดวิชาและงานได้เอง ใส่รายละเอียดงาน/แล็บ/สถานที่/เวลาได้
และเด้ง **popup แจ้งเตือน** เมื่อเพิ่มงาน

ตารางฟิกถูกแปลงมาจาก `KMITL_Semester_1_2569_Full_Schedule.csv` (ดู `web/src/lib/seed.ts`)

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + GSAP (อนิเมชันสมูท)
- **Backend:** Go (net/http, stdlib เท่านั้น) เก็บข้อมูลเป็นไฟล์ `data.json`

Frontend ทำงานได้ทันทีแม้ยังไม่เปิด backend โดยจะ fallback ไปเก็บข้อมูลใน
`localStorage` ของเบราว์เซอร์ และจะสลับมาใช้ Go API อัตโนมัติเมื่อ backend ออนไลน์

---

## โครงสร้าง

```
Physiot/
├─ web/      # Next.js + Tailwind + GSAP
├─ server/   # Go API
└─ legacy/   # เวอร์ชันแรก (HTML/CSS/JS ล้วน)
```

## การรัน

### 1) Frontend

```bash
cd web
npm install      # ครั้งแรกเท่านั้น
npm run dev      # http://localhost:3000
```

### 2) Backend (ต้องติดตั้ง Go ก่อน — ดูด้านล่าง)

```bash
cd server
go run .          # http://localhost:8080
```

ตั้งค่าได้ผ่าน env: `PORT` (ดีฟอลต์ 8080), `DATA_FILE` (ดีฟอลต์ `data.json`)

frontend ชี้ไปที่ backend ผ่าน `web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## ติดตั้ง Go (ยังไม่มีในเครื่อง)

```bash
brew install go        # macOS (Homebrew)
# หรือดาวน์โหลดจาก https://go.dev/dl/
```

## API

| Method | Path                                | คำอธิบาย                  |
| ------ | ----------------------------------- | ------------------------- |
| GET    | `/api/health`                       | health check              |
| GET    | `/api/months/{key}`                 | ดึงตารางของเดือน (เช่น `2026-06`) |
| PUT    | `/api/months/{key}/classes`         | เพิ่ม/แก้ไขวิชา (body = ClassItem) |
| DELETE | `/api/months/{key}/classes/{id}`    | ลบวิชา                    |

## ฟีเจอร์

- ตารางรายเดือน จันทร์–เสาร์ 08:00–20:00 บล็อกวิชาแสดงตามช่วงเวลาจริง
- เพิ่ม/แก้ไข/ลบวิชาเอง (ชื่อ, วัน, ประเภทบรรยาย/แล็บ, เวลา, สถานที่, หมายเหตุ)
- ใส่งาน/แล็บ/การบ้านในแต่ละวิชา พร้อมกำหนดส่ง
- **Popup แจ้งเตือน** เมื่อเพิ่มงาน/บันทึก/ลบ
- แถบงานที่ใกล้ถึงกำหนด เรียงตามวันส่ง
- อนิเมชันสมูทด้วย GSAP (เข้าหน้า, การ์ดวิชา, modal, toast, เปลี่ยนเดือน)
```
