"""
Fast Panchang Database Generator - Panchang Krishi Mitra
=========================================================
Strategy for speed:
  - Compute ALL Sun/Moon positions in one vectorized batch at 1-hour resolution
  - Tithi/Nakshatra end times found by scanning hourly array (no bisection per-day)
  - Sunrise/Sunset computed with Skyfield almanac per-district (unavoidable)
  - Full 2-year × 12-district dataset generates in ~3-5 minutes
"""

import json
import datetime
import sys
import numpy as np

from skyfield.api import load, wgs84
from skyfield import almanac
from skyfield.framelib import ecliptic_frame

sys.stdout.reconfigure(encoding='utf-8')

print("Loading Skyfield ephemeris...")
ts = load.timescale()
eph = load('de421.bsp')
earth  = eph['earth']
sun_b  = eph['sun']
moon_b = eph['moon']

LAHIRI = 24.135   # Lahiri Ayanamsa 2026-2027

# ── District list ─────────────────────────────────────────────────────────────
DISTRICTS = [
    {"id":"pune",       "name_en":"Pune",                      "name_mr":"पुणे",               "lat":18.5204,"lon":73.8567},
    {"id":"mumbai",     "name_en":"Mumbai",                    "name_mr":"मुंबई",              "lat":18.9750,"lon":72.8258},
    {"id":"nashik",     "name_en":"Nashik",                    "name_mr":"नाशिक",              "lat":19.9975,"lon":73.7898},
    {"id":"nagpur",     "name_en":"Nagpur",                    "name_mr":"नागपूर",             "lat":21.1458,"lon":79.0882},
    {"id":"aurangabad", "name_en":"Chhatrapati Sambhajinagar", "name_mr":"छत्रपती संभाजीनगर",  "lat":19.8762,"lon":75.3433},
    {"id":"solapur",    "name_en":"Solapur",                   "name_mr":"सोलापूर",            "lat":17.6599,"lon":75.9064},
    {"id":"kolhapur",   "name_en":"Kolhapur",                  "name_mr":"कोल्हापूर",          "lat":16.7050,"lon":74.2433},
    {"id":"jalgaon",    "name_en":"Jalgaon",                   "name_mr":"जळगाव",              "lat":21.0077,"lon":75.5626},
    {"id":"akola",      "name_en":"Akola",                     "name_mr":"अकोला",              "lat":20.7002,"lon":77.0082},
    {"id":"nanded",     "name_en":"Nanded",                    "name_mr":"नांदेड",             "lat":19.1383,"lon":77.3210},
    {"id":"ratnagiri",  "name_en":"Ratnagiri",                 "name_mr":"रत्नागिरी",          "lat":16.9902,"lon":73.3120},
    {"id":"amravati",   "name_en":"Amravati",                  "name_mr":"अमरावती",            "lat":20.9374,"lon":77.7796},
    {"id":"raigad",     "name_en":"Raigad",                    "name_mr":"रायगड",              "lat":18.3699,"lon":73.2552},
    {"id":"sindhudurg", "name_en":"Sindhudurg",                "name_mr":"सिंधुदुर्ग",          "lat":16.2141,"lon":73.5126},
]

MONSOON_NAKS = [
    {"id":4, "name":"rohini",         "mr":"रोहिणी",         "deg":40.0},
    {"id":5, "name":"mriga",          "mr":"मृगशीर्ष",       "deg":53.333333},
    {"id":6, "name":"ardra",          "mr":"आर्द्रा",        "deg":66.666667},
    {"id":7, "name":"punarvasu",      "mr":"पुनर्वसू",       "deg":80.0},
    {"id":8, "name":"pushya",         "mr":"पुष्य",          "deg":93.333333},
    {"id":9, "name":"ashlesha",       "mr":"आश्लेषा",       "deg":106.666667},
    {"id":10,"name":"magha",          "mr":"मघा",            "deg":120.0},
    {"id":11,"name":"purva phalguni", "mr":"पूर्वा फाल्गुनी","deg":133.333333},
    {"id":12,"name":"uttara phalguni","mr":"उत्तरा फाल्गुनी","deg":146.666667},
    {"id":13,"name":"hasta",          "mr":"हस्त",           "deg":160.0},
    {"id":14,"name":"chitra",         "mr":"चित्रा",        "deg":173.333333},
    {"id":15,"name":"swati",          "mr":"स्वाती",        "deg":186.666667},
    {"id":16,"name":"vishakha",       "mr":"विशाखा",        "deg":200.0},
]

TITHIS = [
    "प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पंचमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी",
    "एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पौर्णमासी",
    "प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पंचमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी",
    "एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","अमावास्या"
]
NAKSHATRAS = [
    "अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशीर्ष","आर्द्रा","पुनर्वसू","पुष्य","आश्लेषा","मघा",
    "पूर्वा फाल्गुनी","उत्तरा फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा",
    "मूळ","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा","पूर्वाभाद्रपदा","उत्तराभाद्रपदा","रेवती"
]
YOGAS = [
    "विष्कंभ","प्रीती","आयुष्यमान","सौभाग्य","शोभन","अतिगंड","सुकर्मा","धृती","शूल","गंड","वृद्धी","ध्रुव",
    "व्याघात","हर्षण","वज्र","सिद्धी","व्यतिपात","वरीयान","परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल",
    "ब्रह्म","इंद्र","वैधृती"
]
KARANS_MOV = ["बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टी"]
MONTH_NAMES = ["चैत्र","वैशाख","ज्येष्ठ","आषाढ","श्रावण","भाद्रपद","अश्विन","कार्तिक","मार्गशीर्ष","पौष","माघ","फाल्गुन"]

VAHANS = {
    0:{"name":"Elephant","mr":"हत्ती", "rain":"Very Heavy (मुसळधार पाऊस)",         "desc":"अतिवृष्टी, पूर परिस्थिती आणि नद्या ओसंडून वाहतील असा पाऊस."},
    1:{"name":"Horse",   "mr":"घोडा",  "rain":"Medium (मध्यम पाऊस)",              "desc":"डोंगरदऱ्यांच्या किंवा पठारी भागात चांगला पाऊस, सोसाट्याचा वारा."},
    2:{"name":"Fox",     "mr":"कोल्हा","rain":"Low/Uneven (कमी किंवा ओढ देणारा पाऊस)","desc":"अल्प पाऊस किंवा पावसाची ओढ लागणे, पिकांवर रोगराईचे संकट."},
    3:{"name":"Frog",    "mr":"बेडूक", "rain":"Very Good (उत्तम पाऊस)",           "desc":"सलग आणि सार्वत्रिक पाऊस, पिकांसाठी आणि पेरणीसाठी अत्यंत पोषक वातावरण."},
    4:{"name":"Ram",     "mr":"मेंढा", "rain":"Low/Uneven (कमी किंवा ओढ देणारा पाऊस)","desc":"थंड वारे, हलक्या सरी परंतु समाधानकारक पाणी नाही."},
    5:{"name":"Peacock", "mr":"मोर",   "rain":"Medium (मध्यम पाऊस)",              "desc":"सुखावह हवामान, ठिकठिकाणी मध्यम स्वरूपाचा पाऊस."},
    6:{"name":"Mouse",   "mr":"उंदीर", "rain":"Low/Crop damage (अल्प पाऊस / उंदरांचा प्रादुर्भाव)","desc":"अल्प पाऊस, कोरडे ढग आणि उंदीर/किड्यांमुळे पिकांचे नुकसान होण्याची भीती."},
    7:{"name":"Buffalo", "mr":"म्हैस","rain":"Heavy (भरपूर पाऊस)",               "desc":"जोरदार पाऊस, शेतजमिनी तृप्त होतील आणि पाण्याची पातळी वाढेल."},
    8:{"name":"Donkey",  "mr":"गाढव", "rain":"Scant/Dry (अल्प पाऊस / कोरडे हवामान)","desc":"पावसाची तीव्र ओढ, अतिशय कमी पाऊस, जमीन कोरडी राहण्याची शक्यता."},
}

NAK_MAP = {n["id"]: n["name"] for n in MONSOON_NAKS}   # nak_id -> name key

# ── Vectorized position computation ──────────────────────────────────────────

def compute_positions_batch(jd_array):
    """Return Nirayana Sun lon, Moon lon arrays for given JD array."""
    t = ts.ut1_jd(jd_array)
    es = earth.at(t).observe(sun_b).apparent()
    em = earth.at(t).observe(moon_b).apparent()
    _, ls, _ = es.frame_latlon(ecliptic_frame)
    _, lm, _ = em.frame_latlon(ecliptic_frame)
    s_sun  = (ls.degrees - LAHIRI) % 360
    s_moon = (lm.degrees - LAHIRI) % 360
    return s_sun, s_moon


# ── Build hourly cache for a year ─────────────────────────────────────────────

_hourly = {}   # year -> (jds, s_sun, s_moon)

def build_hourly_cache(year):
    if year in _hourly:
        return
    print(f"  Building hourly position cache for {year} (8760 samples)…")
    start_jd = ts.utc(year - 1, 12, 31).ut1   # Dec 31 of prev year
    jds = np.arange(start_jd, start_jd + 367, 1/24.0)  # 1-hr steps, 367 days
    s_sun, s_moon = compute_positions_batch(jds)
    _hourly[year] = (jds, s_sun, s_moon)


def hourly_at(year, jd_target):
    """Linear interpolation of sid positions from hourly cache."""
    jds, ss, sm = _hourly[year]
    idx = np.searchsorted(jds, jd_target)
    idx = np.clip(idx, 1, len(jds) - 1)
    lo, hi = idx - 1, idx
    frac = (jd_target - jds[lo]) / (jds[hi] - jds[lo])
    sun_i  = ss[lo] + frac * ((ss[hi] - ss[lo] + 180) % 360 - 180)
    moon_i = sm[lo] + frac * ((sm[hi] - sm[lo] + 180) % 360 - 180)
    return float(sun_i % 360), float(moon_i % 360)


def find_end_time_hourly(year, search_start_jd, target, which="moon_sun_diff"):
    """
    Scan forward hour by hour from search_start_jd to find when
    the function crosses target. Returns a time string (HH:MM IST) or 'उत्तररात्र'.
    """
    jds, ss, sm = _hourly[year]

    if which == "moon_sun_diff":
        vals = (sm - ss) % 360
    else:
        vals = sm % 360

    # Find index closest to search_start_jd
    start_idx = int(np.searchsorted(jds, search_start_jd))
    start_idx = max(0, min(start_idx, len(jds) - 2))

    prev_diff = (vals[start_idx] - target + 180) % 360 - 180

    for i in range(start_idx + 1, min(start_idx + 30, len(jds))):  # scan up to 30 hours
        curr_diff = (vals[i] - target + 180) % 360 - 180

        if prev_diff <= 0 < curr_diff:
            # Linear interpolation for sub-hour precision
            frac = abs(prev_diff) / (abs(prev_diff) + abs(curr_diff))
            crossing_jd = jds[i - 1] + frac * (jds[i] - jds[i - 1])
            dt_ist = (ts.ut1_jd(crossing_jd).utc_datetime()
                      + datetime.timedelta(hours=5, minutes=30))

            # Only return if it's within the same day (roughly within next 24h from sunrise)
            ref_ist = (ts.ut1_jd(search_start_jd).utc_datetime()
                       + datetime.timedelta(hours=5, minutes=30))
            if dt_ist.date() == ref_ist.date():
                return dt_ist.strftime('%H:%M')
            else:
                return "उत्तररात्र"

        prev_diff = curr_diff

    return "उत्तररात्र"


# ── Vahan calculator ──────────────────────────────────────────────────────────

def calculate_vahans(year):
    """Return ingress times + Vahans for all monsoon Nakshatras in a year."""
    build_hourly_cache(year)
    jds, ss, sm = _hourly[year]

    results = {}
    for nak in MONSOON_NAKS:
        target = nak["deg"]
        # Find crossing in the hourly array (Sun enters this Nakshatra)
        prev = (ss[0] - target + 180) % 360 - 180
        ingress_jd = None
        for i in range(1, len(ss)):
            curr = (ss[i] - target + 180) % 360 - 180
            if prev < 0 <= curr:
                frac = abs(prev) / (abs(prev) + abs(curr))
                ingress_jd = jds[i-1] + frac * (jds[i] - jds[i-1])
                break
            prev = curr

        if ingress_jd is None:
            continue

        s_sun_i, s_moon_i = hourly_at(year, ingress_jd)
        dt_utc = ts.ut1_jd(ingress_jd).utc_datetime()
        ist_dt = dt_utc + datetime.timedelta(hours=5, minutes=30)

        moon_nak_idx = int(s_moon_i // (360.0 / 27.0)) + 1
        count = (moon_nak_idx - nak["id"]) % 27 + 1
        vahan_idx = count % 9
        v = VAHANS[vahan_idx]

        results[nak["name"]] = {
            "name":             nak["name"],
            "marathi_name":     nak["mr"],
            "ingress_time_ist": ist_dt.strftime('%Y-%m-%d %H:%M:%S'),
            "vahan_marathi":    v["mr"],
            "vahan_english":    v["name"],
            "vahan_rain":       v["rain"],
            "vahan_desc":       v["desc"],
        }
    return results


# ── Lunar month helper ────────────────────────────────────────────────────────

_luna_cache = {}  # year -> list of (jd, month_name)

def build_luna_cache(year):
    if year in _luna_cache:
        return
    build_hourly_cache(year)
    jds, ss, sm = _hourly[year]
    diff = (sm - ss) % 360
    amavasyas = []
    for i in range(len(diff) - 1):
        if diff[i] > 300 and diff[i+1] < 60:
            frac = (360 - diff[i]) / ((diff[i+1] + 360 - diff[i]) % 360)
            nm_jd = jds[i] + frac * (jds[i+1] - jds[i])
            s_sun_nm, _ = hourly_at(year, nm_jd)
            rashi_idx   = int(s_sun_nm // 30)
            amavasyas.append((nm_jd, MONTH_NAMES[rashi_idx]))

    # Adhik Masa detection
    for i in range(len(amavasyas) - 1):
        if amavasyas[i][1] == amavasyas[i+1][1]:
            amavasyas[i]   = (amavasyas[i][0],   "अधिक " + amavasyas[i][1])
            amavasyas[i+1] = (amavasyas[i+1][0], "निज "   + amavasyas[i+1][1])

    _luna_cache[year] = amavasyas

def get_lunar_month(jd, year):
    build_luna_cache(year)
    ams = _luna_cache[year]
    for i in range(len(ams) - 1):
        if ams[i][0] <= jd < ams[i+1][0]:
            return ams[i+1][1]
    return "अज्ञात"


# ── Karan name ────────────────────────────────────────────────────────────────

def karan_name(diff_deg):
    idx = int(diff_deg // 6)
    if idx == 0:      return "किंस्तुघ्न"
    elif idx <= 56:   return KARANS_MOV[(idx - 1) % 7]
    elif idx == 57:   return "शकुनी"
    elif idx == 58:   return "चतुष्पाद"
    else:             return "नाग"


# ── Shaka year ────────────────────────────────────────────────────────────────

def shaka_year(dt):
    GUDHI = {2026: datetime.date(2026, 3, 19), 2027: datetime.date(2027, 3, 8)}
    if dt.year in GUDHI:
        base = dt.date() if hasattr(dt, 'date') else dt
        return dt.year - 78 if base >= GUDHI[dt.year] else dt.year - 79
    return dt.year - 78


# ── Main: per-district daily panchang ─────────────────────────────────────────

def generate_for_district_year(district, year, vahans_db):
    loc = wgs84.latlon(district["lat"], district["lon"])
    build_hourly_cache(year)

    start_date = datetime.date(year, 1, 1)
    n_days = 366 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 365
    records = {}

    for i in range(n_days):
        curr = start_date + datetime.timedelta(days=i)

        # Sunrise / Sunset
        t0 = ts.utc(curr.year, curr.month, curr.day, -6)   # ~5:30AM prev day IST
        t1 = ts.utc(curr.year, curr.month, curr.day, 19)   # ~12:30AM next day IST
        ev_t, ev_y = almanac.find_discrete(t0, t1, almanac.sunrise_sunset(eph, loc))

        sunrise_jd = sunset_jd = None
        for ti, yi in zip(ev_t, ev_y):
            local_dt = ti.utc_datetime() + datetime.timedelta(hours=5, minutes=30)
            if local_dt.date() == curr:
                if yi == 1 and sunrise_jd is None:
                    sunrise_jd = ti.ut1
                elif yi == 0:
                    sunset_jd = ti.ut1

        if sunrise_jd is None:
            sunrise_jd = ts.utc(curr.year, curr.month, curr.day, 1).ut1  # 6:30 IST
        if sunset_jd is None:
            sunset_jd  = ts.utc(curr.year, curr.month, curr.day, 13).ut1

        # Panchang at sunrise via interpolated hourly cache
        s_sun, s_moon = hourly_at(year, sunrise_jd)
        diff = (s_moon - s_sun) % 360
        tithi_num = int(diff // 12) + 1
        nak_num   = int(s_moon // (360 / 27)) + 1
        yoga_num  = int(((s_sun + s_moon) % 360) // (360 / 27)) + 1

        # End times from hourly scan (fast)
        tithi_target = (tithi_num * 12) % 360
        nak_target   = (nak_num * (360 / 27)) % 360
        tithi_end = find_end_time_hourly(year, sunrise_jd, tithi_target, "moon_sun_diff")
        nak_end   = find_end_time_hourly(year, sunrise_jd, nak_target,   "moon_lon")

        # Lunar Month & Paksha
        lunar_month = get_lunar_month(sunrise_jd, curr.year)
        paksha = "शुक्ल पक्ष" if tithi_num <= 15 else "कृष्ण पक्ष"
        shaka  = shaka_year(curr)

        # Sun Nakshatra and Vahan
        sun_nak_idx  = int(s_sun // (360 / 27)) + 1
        sun_nak_name = NAKSHATRAS[sun_nak_idx - 1]

        vahan_mr = vahan_rain = vahan_desc = "लागू नाही"
        sun_nak_id = sun_nak_idx  # 1-indexed
        if sun_nak_id in NAK_MAP:
            nak_key = NAK_MAP[sun_nak_id]
            if nak_key in vahans_db:
                v = vahans_db[nak_key]
                vahan_mr, vahan_rain, vahan_desc = v["vahan_marathi"], v["vahan_rain"], v["vahan_desc"]

        sr_ist = ts.ut1_jd(sunrise_jd).utc_datetime() + datetime.timedelta(hours=5, minutes=30)
        ss_ist = ts.ut1_jd(sunset_jd).utc_datetime()  + datetime.timedelta(hours=5, minutes=30)

        date_str = curr.strftime('%Y-%m-%d')
        records[date_str] = {
            "sunrise":    sr_ist.strftime('%H:%M'),
            "sunset":     ss_ist.strftime('%H:%M'),
            "tithi_num":  tithi_num,
            "tithi_name": TITHIS[tithi_num - 1],
            "tithi_end":  tithi_end,
            "nak_num":    nak_num,
            "nak_name":   NAKSHATRAS[nak_num - 1],
            "nak_end":    nak_end,
            "yoga_name":  YOGAS[yoga_num - 1],
            "karan_name": karan_name(diff),
            "month_mr":   lunar_month,
            "paksha":     paksha,
            "shaka":      shaka,
            "sun_nak":    sun_nak_name,
            "vahan":      vahan_mr,
            "vahan_rain": vahan_rain,
            "vahan_desc": vahan_desc,
            "weekday":    str(curr.isoweekday() % 7),  # 0=Sun
        }

    return records


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    import time
    t0 = time.time()

    db = {
        "districts":     DISTRICTS,
        "monsoon_vahans": {},
        "panchang":       {d["id"]: {} for d in DISTRICTS},
    }

    # Historical Vahans 2020–2025
    print("\nComputing historical Vahans (2020-2025)…")
    for yr in range(2020, 2026):
        print(f"  {yr}…")
        db["monsoon_vahans"][str(yr)] = calculate_vahans(yr)
    print(f"  Done historical in {time.time()-t0:.1f}s")

    # Full daily panchang for 2026 and 2027
    for yr in [2026, 2027]:
        print(f"\nYear {yr}: computing Vahans…")
        vahans_db = calculate_vahans(yr)
        db["monsoon_vahans"][str(yr)] = vahans_db

        for di, district in enumerate(DISTRICTS):
            print(f"  [{di+1}/{len(DISTRICTS)}] {district['name_en']}…", end='', flush=True)
            dt0 = time.time()
            records = generate_for_district_year(district, yr, vahans_db)
            db["panchang"][district["id"]][str(yr)] = records
            print(f" {time.time()-dt0:.1f}s")

    out = "panchang_database.json"
    print(f"\nWriting {out}…")
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = len(json.dumps(db, ensure_ascii=False)) / 1_000_000
    print(f"✅ Done! {out} ({size_mb:.1f} MB) in {time.time()-t0:.1f}s total")

if __name__ == '__main__':
    main()
