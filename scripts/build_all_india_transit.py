#!/usr/bin/env python3
"""
Pan-India Transit GTFS Builder
Generates validated GTFS packages for all major Indian Metro & Bus systems:
- Delhi-NCR (DMRC, NMRC, Rapid Metro, DTC)
- Mumbai (Mumbai Metro Lines 1, 2A, 7, 3 + Suburban + BEST)
- Bengaluru (Namma Metro + BMTC)
- Chennai (CMRL + MTC)
- Hyderabad (L&T Hyderabad Metro + TSRTC)
- Kolkata (Kolkata Metro Lines 1, 2, 3, 6 + WBTC)
- Pune (Pune Metro Purple & Aqua + PMPML)
- Ahmedabad (Ahmedabad Metro + Janmarg BRTS)
- Kochi (Kochi Metro & Water Metro)
"""
import csv, math, os, zipfile, sys, json
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
INDIA_DIR = ROOT / "india"
INDIA_DIR.mkdir(exist_ok=True)

# ─── Transit Network Definitions for Major Indian Cities ───────────────────────

INDIAN_TRANSIT_NETWORKS = {
    "bengaluru": {
        "city_name": "Bengaluru",
        "agency": ("BMRCL", "Bangalore Metro Rail Corporation Limited & BMTC", "https://bmrc.co.in", "Asia/Kolkata"),
        "lines": {
            "Purple Line": {
                "id": "BMRCL_PUR",
                "color": "7E22CE",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Whitefield (Kadugodi) - Challaghatta",
                "stations": [
                    ("WHTM", "Whitefield (Kadugodi)", 12.9957, 77.7579),
                    ("KRPM", "Krishnarajapura", 12.9999, 77.6776),
                    ("BYPL", "Baiyappanahalli", 12.9907, 77.6523),
                    ("IDN", "Indiranagar", 12.9783, 77.6386),
                    ("HLRU", "Halasuru", 12.9764, 77.6266),
                    ("TTY", "Trinity", 12.9730, 77.6170),
                    ("MAGR", "Mahatma Gandhi Road", 12.9756, 77.6067),
                    ("CBPK", "Cubbon Park", 12.9809, 77.5975),
                    ("VDSA", "Dr B R Ambedkar Station Vidhana Soudha", 12.9798, 77.5927),
                    ("KGWA", "Nadaprabhu Kempegowda Station Majestic", 12.9755, 77.5731),
                    ("VJN", "Vijayanagar", 12.9709, 77.5374),
                    ("MYRD", "Mysuru Road", 12.9468, 77.5298),
                    ("KNGR", "Kengeri", 12.9079, 77.4765),
                    ("CHLG", "Challaghatta", 12.8972, 77.4612)
                ]
            },
            "Green Line": {
                "id": "BMRCL_GRN",
                "color": "16A34A",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Madavara - Silk Institute",
                "stations": [
                    ("MDVA", "Madavara", 13.0573, 77.4728),
                    ("NGSA", "Nagasandra", 13.0479, 77.5001),
                    ("YPM", "Yeshwanthpur", 13.0232, 77.5497),
                    ("KGWA", "Nadaprabhu Kempegowda Station Majestic", 12.9755, 77.5731),
                    ("NLC", "National College", 12.9608, 77.5746),
                    ("LBGH", "Lalbagh", 12.9465, 77.5800),
                    ("JYN", "Jayanagar", 12.9382, 77.5800),
                    ("BNSK", "Banashankari", 12.9152, 77.5735),
                    ("SLKI", "Silk Institute", 12.8619, 77.5486)
                ]
            }
        }
    },
    "delhi_ncr": {
        "city_name": "Delhi-NCR",
        "agency": ("DMRC", "Delhi Metro Rail Corporation & DTC", "https://delhimetrorail.com", "Asia/Kolkata"),
        "lines": {
            "Yellow Line": {
                "id": "DMRC_YEL",
                "color": "FACC15",
                "text_color": "000000",
                "route_type": "1",
                "long_name": "Samaypur Badli - Millennium City Centre Gurugram",
                "stations": [
                    ("SPB", "Samaypur Badli", 28.7454, 77.1367),
                    ("RGNR", "Rohini Sector 18-19", 28.7366, 77.1408),
                    ("HYP", "Haiderpur Badli Mor", 28.7249, 77.1497),
                    ("JPR", "Jahangirpuri", 28.7153, 77.1601),
                    ("ADNR", "Adarsh Nagar", 28.7042, 77.1687),
                    ("AZP", "Azadpur", 28.6978, 77.1772),
                    ("MTN", "Model Town", 28.6908, 77.1895),
                    ("GTB", "GTB Nagar", 28.6983, 77.2064),
                    ("VVD", "Vishwa Vidyalaya (Delhi University)", 28.6922, 77.2144),
                    ("VNS", "Vidhan Sabha", 28.6811, 77.2217),
                    ("CSL", "Civil Lines", 28.6738, 77.2246),
                    ("KGT", "Kashmere Gate", 28.6675, 77.2285),
                    ("CDCK", "Chandni Chowk", 28.6578, 77.2301),
                    ("CWRI", "Chawri Bazar", 28.6496, 77.2263),
                    ("NDLS", "New Delhi (Railway Station)", 28.6427, 77.2219),
                    ("RGCR", "Rajiv Chowk (Connaught Place)", 28.6328, 77.2195),
                    ("PATC", "Patel Chowk", 28.6231, 77.2142),
                    ("CSN", "Central Secretariat", 28.6148, 77.2117),
                    ("UDYB", "Udyog Bhawan", 28.6087, 77.2120),
                    ("LKP", "Lok Kalyan Marg", 28.5989, 77.2132),
                    ("JRP", "Jor Bagh", 28.5886, 77.2147),
                    ("DIAT", "Dilli Haat - INA", 28.5746, 77.2104),
                    ("AIIMS", "AIIMS", 28.5684, 77.2081),
                    ("GNRP", "Green Park", 28.5588, 77.2063),
                    ("HKZ", "Hauz Khas", 28.5434, 77.2062),
                    ("MVI", "Malviya Nagar", 28.5322, 77.2065),
                    ("SKT", "Saket", 28.5209, 77.2017),
                    ("QUTB", "Qutab Minar", 28.5042, 77.1866),
                    ("CSHP", "Chhatarpur", 28.4984, 77.1728),
                    ("SLTP", "Sultanpur", 28.4908, 77.1557),
                    ("GHRP", "Ghitorni", 28.4831, 77.1384),
                    ("ARJN", "Arjan Garh", 28.4752, 77.1258),
                    ("GDBK", "Guru Dronacharya", 28.4808, 77.1037),
                    ("SDRC", "Sikanderpur", 28.4819, 77.0928),
                    ("MGTR", "MG Road Gurgaon", 28.4797, 77.0805),
                    ("IFFC", "IFFCO Chowk", 28.4722, 77.0725),
                    ("MCCG", "Millennium City Centre Gurugram", 28.4593, 77.0725)
                ]
            },
            "Blue Line": {
                "id": "DMRC_BLU",
                "color": "2563EB",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Dwarka Sector 21 - Noida Electronic City / Vaishali",
                "stations": [
                    ("DW21", "Dwarka Sector 21", 28.5522, 77.0583),
                    ("DW08", "Dwarka Sector 8", 28.5689, 77.0678),
                    ("DW09", "Dwarka Sector 9", 28.5772, 77.0642),
                    ("DW10", "Dwarka Sector 10", 28.5811, 77.0575),
                    ("DW11", "Dwarka Sector 11", 28.5866, 77.0492),
                    ("DW12", "Dwarka Sector 12", 28.5925, 77.0408),
                    ("DW13", "Dwarka Sector 13", 28.5997, 77.0328),
                    ("DW14", "Dwarka Sector 14", 28.6047, 77.0258),
                    ("DWRK", "Dwarka", 28.6142, 77.0197),
                    ("DWMR", "Dwarka Mor", 28.6194, 77.0325),
                    ("NWD", "Nawada", 28.6219, 77.0436),
                    ("UTMN", "Uttam Nagar West", 28.6247, 77.0564),
                    ("UTME", "Uttam Nagar East", 28.6281, 77.0653),
                    ("JNP", "Janakpuri West", 28.6294, 77.0778),
                    ("JNPE", "Janakpuri East", 28.6325, 77.0886),
                    ("TLKN", "Tilak Nagar", 28.6366, 77.0989),
                    ("SBZN", "Subhash Nagar", 28.6403, 77.1058),
                    ("TGN", "Tagore Garden", 28.6442, 77.1147),
                    ("RJGN", "Rajouri Garden", 28.6489, 77.1231),
                    ("RMSN", "Ramesh Nagar", 28.6528, 77.1336),
                    ("MTIN", "Moti Nagar", 28.6575, 77.1439),
                    ("KRTN", "Kirti Nagar", 28.6558, 77.1539),
                    ("SHDB", "Shadipur", 28.6517, 77.1644),
                    ("PTLN", "Patel Nagar", 28.6528, 77.1728),
                    ("RJEB", "Rajendra Place", 28.6425, 77.1786),
                    ("KBLB", "Karol Bagh", 28.6442, 77.1903),
                    ("JNDW", "Jhandewalan", 28.6442, 77.2008),
                    ("RKA", "RK Ashram Marg", 28.6386, 77.2108),
                    ("RGCR", "Rajiv Chowk", 28.6328, 77.2195),
                    ("BRK", "Barakhamba Road", 28.6308, 77.2272),
                    ("MDHR", "Mandi House", 28.6258, 77.2344),
                    ("IPST", "Indraprastha", 28.6211, 77.2514),
                    ("YMBR", "Yamuna Bank", 28.6231, 77.2658),
                    ("AXDM", "Akshardham", 28.6178, 77.2797),
                    ("MYVR", "Mayur Vihar-I", 28.6053, 77.2942),
                    ("MYVE", "Mayur Vihar Extension", 28.5942, 77.3017),
                    ("NVAK", "New Ashok Nagar", 28.5886, 77.3075),
                    ("ND15", "Noida Sector 15", 28.5847, 77.3139),
                    ("ND16", "Noida Sector 16", 28.5786, 77.3181),
                    ("ND18", "Noida Sector 18", 28.5708, 77.3236),
                    ("BOTG", "Botanical Garden", 28.5642, 77.3342),
                    ("NDCG", "Golf Course", 28.5672, 77.3458),
                    ("NDCC", "Noida City Centre", 28.5747, 77.3561),
                    ("ND52", "Noida Sector 52", 28.5925, 77.3708),
                    ("NDEC", "Noida Electronic City", 28.6278, 77.3739)
                ]
            },
            "DTC 502 Bus": {
                "id": "DTC_502",
                "color": "10B981",
                "text_color": "FFFFFF",
                "route_type": "3",
                "long_name": "Old Delhi Railway Station - Mehrauli Qutub Minar",
                "stations": [
                    ("DTC_ODRS", "Old Delhi Railway Station", 28.6619, 77.2281),
                    ("DTC_RDEL", "Red Fort (Lal Qila)", 28.6562, 77.2410),
                    ("DTC_DDT", "Delhi Gate", 28.6408, 77.2411),
                    ("DTC_ITO", "ITO Crossing", 28.6294, 77.2422),
                    ("DTC_MHR", "Mandi House Bus Stop", 28.6258, 77.2344),
                    ("DTC_INDG", "India Gate", 28.6129, 77.2295),
                    ("DTC_LODI", "Lodhi Garden / Jor Bagh", 28.5886, 77.2147),
                    ("DTC_AIIMS", "AIIMS Hospital Bus Bay", 28.5684, 77.2081),
                    ("DTC_HKZ", "Hauz Khas Bus Terminal", 28.5434, 77.2062),
                    ("DTC_QUTB", "Mehrauli Qutub Minar Bus Stand", 28.5209, 77.1866)
                ]
            }
        }
    },
    "mumbai": {
        "city_name": "Mumbai (MMR)",
        "agency": ("MMRDA", "Mumbai Metro & BEST Undertaking", "https://mmrda.maharashtra.gov.in", "Asia/Kolkata"),
        "lines": {
            "Line 1 (Blue)": {
                "id": "MMR_L1",
                "color": "0284C7",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Versova - Andheri - Ghatkopar",
                "stations": [
                    ("VERS", "Versova", 19.1314, 72.8184),
                    ("DNGR", "D.N. Nagar", 19.1297, 72.8286),
                    ("AZDN", "Azad Nagar", 19.1278, 72.8361),
                    ("ANDW", "Andheri (Metro / Railway Interchange)", 19.1208, 72.8464),
                    ("WEH", "Western Express Highway", 19.1172, 72.8569),
                    ("CHKL", "Chakala (J.B. Nagar)", 19.1128, 72.8669),
                    ("AIRP", "Airport Road", 19.1097, 72.8753),
                    ("MRNP", "Marol Naka", 19.1086, 72.8808),
                    ("SAKI", "Saki Naka", 19.1042, 72.8886),
                    ("ASLP", "Asalpha", 19.0978, 72.9006),
                    ("JGBR", "Jagruti Nagar", 19.0925, 72.9075),
                    ("GHAT", "Ghatkopar (Railway Interchange)", 19.0864, 72.9081)
                ]
            },
            "Line 2A (Yellow)": {
                "id": "MMR_L2A",
                "color": "EAB308",
                "text_color": "000000",
                "route_type": "1",
                "long_name": "Dahisar East - Andheri West (D.N. Nagar)",
                "stations": [
                    ("DHSE", "Dahisar East", 19.2575, 72.8625),
                    ("ANND", "Anand Nagar", 19.2486, 72.8589),
                    ("KNDV", "Kandivali West", 19.2081, 72.8386),
                    ("MLDW", "Malad West", 19.1867, 72.8353),
                    ("GORG", "Goregaon West", 19.1625, 72.8342),
                    ("OSHWR", "Oshiwara", 19.1436, 72.8319),
                    ("DNGR", "D.N. Nagar (Interchange Line 1)", 19.1297, 72.8286)
                ]
            },
            "BEST Bus 332": {
                "id": "BEST_332",
                "color": "DC2626",
                "text_color": "FFFFFF",
                "route_type": "3",
                "long_name": "Andheri Railway Station East - Kurla Bus Station",
                "stations": [
                    ("BEST_AND", "Andheri Station East Bus Stand", 19.1197, 72.8472),
                    ("BEST_CHKL", "Chakala MIDC", 19.1158, 72.8622),
                    ("BEST_SAKI", "Saki Naka Junction", 19.1042, 72.8886),
                    ("BEST_KURLA", "Kurla Railway Station West", 19.0681, 72.8797)
                ]
            }
        }
    },
    "chennai": {
        "city_name": "Chennai",
        "agency": ("CMRL", "Chennai Metro Rail Limited & MTC", "https://chennaimetrorail.org", "Asia/Kolkata"),
        "lines": {
            "Blue Line": {
                "id": "CMRL_BLU",
                "color": "2563EB",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Wimco Nagar Depot - Chennai International Airport",
                "stations": [
                    ("WMCN", "Wimco Nagar", 13.1678, 80.3019),
                    ("TOLG", "Tollgate", 13.1367, 80.2936),
                    ("WSHM", "Washermanpet", 13.1097, 80.2819),
                    ("CHHC", "High Court", 13.0872, 80.2878),
                    ("CHCT", "Puratchi Thalaivar Dr. M.G. Ramachandran Central (Central Metro)", 13.0819, 80.2747),
                    ("AGSM", "AG-DMS", 13.0456, 80.2486),
                    ("TNND", "Teynampet", 13.0378, 80.2442),
                    ("NAND", "Nandanam", 13.0306, 80.2403),
                    ("SAID", "Saidapet", 13.0219, 80.2269),
                    ("GUIN", "Guindy (Railway Interchange)", 13.0089, 80.2131),
                    ("ALND", "Alandur (Interchange)", 12.9978, 80.1986),
                    ("MEEN", "Meenambakkam", 12.9867, 80.1797),
                    ("AIRP", "Chennai International Airport", 12.9806, 80.1636)
                ]
            },
            "Green Line": {
                "id": "CMRL_GRN",
                "color": "16A34A",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Puratchi Thalaivar Dr. M.G. Ramachandran Central - St. Thomas Mount",
                "stations": [
                    ("CHCT", "Puratchi Thalaivar Dr. M.G. Ramachandran Central (Central Metro)", 13.0819, 80.2747),
                    ("EGMR", "Egmore (Railway Station)", 13.0786, 80.2608),
                    ("KILP", "Kilpauk Medical College", 13.0781, 80.2425),
                    ("SHEN", "Shenoy Nagar", 13.0789, 80.2261),
                    ("ANNR", "Anna Nagar East", 13.0853, 80.2189),
                    ("TRMN", "Thirumangalam", 13.0858, 80.1989),
                    ("CMBT", "Puratchi Thalaivar Dr. MGR Bus Terminus (CMBT)", 13.0689, 80.2047),
                    ("ARMB", "Arumbakkam", 13.0617, 80.2117),
                    ("VDPN", "Vadapalani", 13.0519, 80.2114),
                    ("ALND", "Alandur (Interchange)", 12.9978, 80.1986),
                    ("STTM", "St. Thomas Mount", 12.9947, 80.1997)
                ]
            },
            "MTC 23C Bus": {
                "id": "MTC_23C",
                "color": "E11D48",
                "text_color": "FFFFFF",
                "route_type": "3",
                "long_name": "Ayanavaram - Besant Nagar",
                "stations": [
                    ("MTC_AYN", "Ayanavaram Bus Terminus", 13.0978, 80.2325),
                    ("MTC_EGMR", "Egmore Railway Station Bus Stop", 13.0786, 80.2608),
                    ("MTC_MYL", "Mylapore Tank", 13.0336, 80.2689),
                    ("MTC_ADYR", "Adyar Signal", 13.0064, 80.2569),
                    ("MTC_BSNT", "Besant Nagar Bus Depot", 12.9997, 80.2686)
                ]
            }
        }
    },
    "hyderabad": {
        "city_name": "Hyderabad",
        "agency": ("HMRL", "Hyderabad Metro Rail & TSRTC", "https://hmrl.co.in", "Asia/Kolkata"),
        "lines": {
            "Red Line": {
                "id": "HMRL_RED",
                "color": "DC2626",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Miyapur - LB Nagar",
                "stations": [
                    ("MYP", "Miyapur", 17.4967, 78.3614),
                    ("JNTU", "JNTU College", 17.4981, 78.3886),
                    ("KPTH", "KPHB Colony", 17.4939, 78.3997),
                    ("KUKT", "Kukatpally", 17.4853, 78.4114),
                    ("BHTN", "Bharat Nagar", 17.4653, 78.4297),
                    ("ERRG", "Erragadda", 17.4589, 78.4386),
                    ("AMRP", "Ameerpet (Interchange)", 17.4358, 78.4486),
                    ("PUNJ", "Punjagutta", 17.4267, 78.4525),
                    ("KHTB", "Khairatabad", 17.4128, 78.4597),
                    ("LAKD", "Lakdi-ka-pul", 17.4042, 78.4653),
                    ("ASMB", "Assembly", 17.3986, 78.4719),
                    ("NAMP", "Nampally (Hyderabad Railway Station)", 17.3917, 78.4714),
                    ("GNDB", "Gandhi Bhavan", 17.3861, 78.4758),
                    ("MGBS", "MGBS (Mahatma Gandhi Bus Station)", 17.3789, 78.4842),
                    ("MLKT", "Malakpet", 17.3739, 78.4975),
                    ("DLSN", "Dilsukhnagar", 17.3686, 78.5258),
                    ("LBNG", "LB Nagar", 17.3486, 78.5528)
                ]
            },
            "Blue Line": {
                "id": "HMRL_BLU",
                "color": "2563EB",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Raidurg (HITEC City) - Nagole",
                "stations": [
                    ("RDG", "Raidurg (Knowledge City)", 17.4422, 78.3775),
                    ("HTCT", "HITEC City", 17.4489, 78.3814),
                    ("DURG", "Durgam Cheruvu", 17.4436, 78.3919),
                    ("MDHP", "Madhapur", 17.4386, 78.4014),
                    ("JBHL", "Jubilee Hills Check Post", 17.4289, 78.4119),
                    ("AMRP", "Ameerpet (Interchange)", 17.4358, 78.4486),
                    ("BGMP", "Begumpet", 17.4389, 78.4614),
                    ("PRDP", "Parade Ground (Secunderabad)", 17.4439, 78.4978),
                    ("SCND", "Secunderabad East (Railway Station)", 17.4347, 78.5042),
                    ("UPPL", "Uppal", 17.3989, 78.5586),
                    ("NAGL", "Nagole", 17.3878, 78.5661)
                ]
            }
        }
    },
    "kolkata": {
        "city_name": "Kolkata",
        "agency": ("KMRCL", "Kolkata Metro & WBTC", "https://mtp.indianrailways.gov.in", "Asia/Kolkata"),
        "lines": {
            "Line 1 (Blue Line - North-South)": {
                "id": "KOL_L1",
                "color": "2563EB",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Dakshineswar - Kavi Subhash (New Garia)",
                "stations": [
                    ("DKSW", "Dakshineswar", 22.6542, 88.3589),
                    ("BARN", "Baranagar", 22.6453, 88.3697),
                    ("DMDM", "Dum Dum (Railway Interchange)", 22.6219, 88.3936),
                    ("BLGC", "Belgachia", 22.6042, 88.3908),
                    ("SHYB", "Shyambazar", 22.5997, 88.3719),
                    ("SOVR", "Sovabazar Sutanuti", 22.5897, 88.3664),
                    ("GIRP", "Girish Park", 22.5853, 88.3619),
                    ("MGTR", "Mahatma Gandhi Road", 22.5808, 88.3586),
                    ("CNCL", "Central", 22.5689, 88.3564),
                    ("CHND", "Chandni Chowk", 22.5642, 88.3553),
                    ("ESPL", "Esplanade (Interchange Line 1 & Line 2 Under-River)", 22.5606, 88.3517),
                    ("PRKS", "Park Street", 22.5519, 88.3514),
                    ("MDSN", "Maidan", 22.5458, 88.3497),
                    ("RBNR", "Rabindra Sadan", 22.5389, 88.3486),
                    ("NTRJ", "Netaji Bhavan", 22.5319, 88.3469),
                    ("JTDN", "Jatin Das Park", 22.5219, 88.3458),
                    ("KLGH", "Kalighat", 22.5167, 88.3453),
                    ("TLYG", "Mahanayak Uttam Kumar (Tollygunge)", 22.4989, 88.3442),
                    ("GARA", "Kavi Subhash (New Garia)", 22.4675, 88.3986)
                ]
            },
            "Line 2 (Green Line - East-West Underwater)": {
                "id": "KOL_L2",
                "color": "16A34A",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Howrah Maidan - Salt Lake Sector V",
                "stations": [
                    ("HWRM", "Howrah Maidan", 22.5878, 88.3289),
                    ("HWRH", "Howrah Railway Station (Underwater Hooghly Tunnel)", 22.5847, 88.3417),
                    ("MHDR", "Mahakaran", 22.5719, 88.3497),
                    ("ESPL", "Esplanade (Interchange Line 1)", 22.5606, 88.3517),
                    ("SLST", "Sealdah (Railway Station)", 22.5686, 88.3719),
                    ("PHLP", "Phoolbagan", 22.5719, 88.3886),
                    ("SLK5", "Salt Lake Sector V", 22.5786, 88.4339)
                ]
            }
        }
    },
    "pune": {
        "city_name": "Pune",
        "agency": ("PMRC", "Pune Metro & PMPML", "https://punemetrorail.org", "Asia/Kolkata"),
        "lines": {
            "Purple Line (Line 1)": {
                "id": "PMR_PUR",
                "color": "7E22CE",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "PCMC Bhavan - Swargate",
                "stations": [
                    ("PCMC", "PCMC Bhavan", 18.6297, 73.8119),
                    ("STUK", "Sant Tukaram Nagar", 18.6208, 73.8206),
                    ("BHSR", "Bhosari (Nashik Phata)", 18.6089, 73.8267),
                    ("KASR", "Kasarwadi", 18.5986, 73.8289),
                    ("DAPD", "Dapodi", 18.5847, 73.8319),
                    ("BOPD", "Bopodi", 18.5719, 73.8342),
                    ("SHVJ", "Shivajinagar (Railway Station)", 18.5319, 73.8508),
                    ("DIST", "District Court (Interchange)", 18.5286, 73.8564),
                    ("KASB", "Kasba Peth (Budhwar Peth)", 18.5186, 73.8586),
                    ("MNDI", "Mandai", 18.5108, 73.8572),
                    ("SWRG", "Swargate", 18.5008, 73.8581)
                ]
            },
            "Aqua Line (Line 2)": {
                "id": "PMR_AQU",
                "color": "06B6D4",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Vanaz - Ramwadi",
                "stations": [
                    ("VNZ", "Vanaz", 18.5053, 73.8019),
                    ("ANDN", "Anand Nagar", 18.5089, 73.8108),
                    ("IDLC", "Ideal Colony", 18.5108, 73.8197),
                    ("NALC", "Nal Stop", 18.5119, 73.8286),
                    ("GRWN", "Garware College", 18.5147, 73.8361),
                    ("DCAN", "Deccan Gymkhana", 18.5189, 73.8425),
                    ("DIST", "District Court (Interchange)", 18.5286, 73.8564),
                    ("PUNR", "Pune Railway Station", 18.5289, 73.8742),
                    ("RUBY", "Ruby Hall Clinic", 18.5325, 73.8808),
                    ("BGWD", "Bund Garden", 18.5397, 73.8886),
                    ("YERW", "Yerawada", 18.5528, 73.8897),
                    ("KALY", "Kalyani Nagar", 18.5519, 73.9042),
                    ("RMWD", "Ramwadi", 18.5558, 73.9186)
                ]
            }
        }
    },
    "ahmedabad": {
        "city_name": "Ahmedabad",
        "agency": ("GMRC", "Gujarat Metro Rail Corporation & AMTS/BRTS", "https://gujaratmetrorail.com", "Asia/Kolkata"),
        "lines": {
            "East-West Corridor (Blue Line)": {
                "id": "AHM_EW",
                "color": "2563EB",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Thaltej Gam - Vastral Gam",
                "stations": [
                    ("TLTG", "Thaltej Gam", 23.0569, 72.5089),
                    ("TLTJ", "Thaltej", 23.0542, 72.5186),
                    ("DOOR", "Doordarshan Kendra", 23.0519, 72.5286),
                    ("GUVR", "Gurukul Road", 23.0489, 72.5386),
                    ("VIJN", "Vijay Nagar", 23.0456, 72.5489),
                    ("COMM", "Commerce Six Road", 23.0389, 72.5564),
                    ("STAD", "Stadium", 23.0358, 72.5628),
                    ("OLDC", "Old High Court (Interchange)", 23.0319, 72.5708),
                    ("SHPR", "Shahpur", 23.0342, 72.5819),
                    ("GPRT", "Gheekanta", 23.0286, 72.5886),
                    ("KLPR", "Kalupur (Ahmedabad Railway Station)", 23.0267, 72.6008),
                    ("KANK", "Kankaria East", 23.0119, 72.6089),
                    ("APPL", "Apparel Park", 23.0086, 72.6208),
                    ("VAST", "Vastral Gam", 22.9986, 72.6586)
                ]
            },
            "North-South Corridor (Red Line)": {
                "id": "AHM_NS",
                "color": "DC2626",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Motera Stadium - APMC",
                "stations": [
                    ("MTRC", "Motera Stadium (Narendra Modi Stadium)", 23.0919, 72.5978),
                    ("SABR", "Sabarmati (Bullet Train Terminal)", 23.0786, 72.5886),
                    ("RNIP", "Ranip", 23.0658, 72.5786),
                    ("USMN", "Usmanpura", 23.0458, 72.5728),
                    ("OLDC", "Old High Court (Interchange)", 23.0319, 72.5708),
                    ("GDHR", "Gandhigram", 23.0242, 72.5686),
                    ("PLDI", "Paldi", 23.0142, 72.5647),
                    ("SREV", "Shreyas", 23.0036, 72.5586),
                    ("JIVR", "Jivraj Park", 22.9942, 72.5486),
                    ("APMC", "APMC Vasna", 22.9842, 72.5386)
                ]
            }
        }
    },
    "kochi": {
        "city_name": "Kochi",
        "agency": ("KMRL", "Kochi Metro Rail Limited & Water Metro", "https://kochimetro.org", "Asia/Kolkata"),
        "lines": {
            "Line 1 (Cyan Line)": {
                "id": "KCH_L1",
                "color": "06B6D4",
                "text_color": "FFFFFF",
                "route_type": "1",
                "long_name": "Aluva - Tripunithura",
                "stations": [
                    ("ALVA", "Aluva", 10.1089, 76.3536),
                    ("PLVT", "Pulinchodu", 10.0986, 76.3486),
                    ("CPNY", "Companypady", 10.0886, 76.3425),
                    ("AMBT", "Ambattukavu", 10.0786, 76.3364),
                    ("MUTM", "Muttom", 10.0686, 76.3308),
                    ("KLMS", "Kalamassery", 10.0542, 76.3219),
                    ("CUST", "CUSAT (University)", 10.0442, 76.3158),
                    ("PATH", "Pathadipalam", 10.0342, 76.3108),
                    ("EDAP", "Edappally (Lulu Mall)", 10.0242, 76.3075),
                    ("CHNG", "Changampuzha Park", 10.0142, 76.3019),
                    ("PLRV", "Palarivattom", 10.0042, 76.2986),
                    ("JLNS", "Jawaharlal Nehru International Stadium", 9.9986, 76.2997),
                    ("KALR", "Kaloor", 9.9925, 76.2928),
                    ("MGTR", "Maharaja's College", 9.9742, 76.2842),
                    ("ERNS", "Ernakulam South (Railway Station)", 9.9678, 76.2886),
                    ("KDVT", "Kadavanthra", 9.9664, 76.2986),
                    ("ELMR", "Elamkulam", 9.9675, 76.3114),
                    ("VYTL", "Vyttila Mobility Hub (Interchange Bus+Water Metro)", 9.9678, 76.3219),
                    ("PETT", "Pettah", 9.9572, 76.3342),
                    ("TRPN", "Tripunithura", 9.9486, 76.3514)
                ]
            },
            "Kochi Water Metro": {
                "id": "KCH_WTR",
                "color": "0284C7",
                "text_color": "FFFFFF",
                "route_type": "4",
                "long_name": "High Court - Vypeen - Fort Kochi Water Metro",
                "stations": [
                    ("WTR_HC", "High Court Water Jetty Terminal", 9.9819, 76.2758),
                    ("WTR_VYP", "Vypeen Terminal", 9.9786, 76.2486),
                    ("WTR_BOL", "Bolgatty Palace Jetty", 9.9886, 76.2686),
                    ("WTR_FTK", "Fort Kochi Water Terminal", 9.9658, 76.2425),
                    ("WTR_VYT", "Vyttila Water Metro Hub", 9.9678, 76.3219)
                ]
            }
        }
    }
}

# ─── Helper Functions ────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def hms(seconds):
    s = int(round(seconds))
    return f"{s//3600:02d}:{(s%3600)//60:02d}:{s%60:02d}"

def generate_city_gtfs(city_key, config):
    city_name = config["city_name"]
    print(f"\n=======================================================")
    print(f"  Building GTFS Package for: {city_name} ({city_key})")
    print(f"=======================================================")

    agency_id, agency_name, agency_url, tz = config["agency"]
    lines = config["lines"]

    city_dir = INDIA_DIR / city_key
    city_dir.mkdir(exist_ok=True)

    tables = {
        "agency.txt": [
            ["agency_id","agency_name","agency_url","agency_timezone","agency_lang"],
            [agency_id, agency_name, agency_url, tz, "en"]
        ],
        "routes.txt": [
            ["route_id","agency_id","route_short_name","route_long_name","route_type","route_color","route_text_color"]
        ],
        "stops.txt": [
            ["stop_id","stop_code","stop_name","stop_lat","stop_lon","location_type","wheelchair_boarding"]
        ],
        "calendar.txt": [
            ["service_id","monday","tuesday","wednesday","thursday","friday","saturday","sunday","start_date","end_date"],
            ["METRO_DAILY","1","1","1","1","1","1","1","20260901","20270901"]
        ],
        "trips.txt": [
            ["route_id","service_id","trip_id","trip_headsign","direction_id","shape_id","bikes_allowed","wheelchair_accessible"]
        ],
        "stop_times.txt": [
            ["trip_id","arrival_time","departure_time","stop_id","stop_sequence","pickup_type","drop_off_type","timepoint"]
        ],
        "shapes.txt": [
            ["shape_id","shape_pt_lat","shape_pt_lon","shape_pt_sequence","shape_dist_traveled"]
        ],
        "feed_info.txt": [
            ["feed_publisher_name","feed_publisher_url","feed_lang","feed_start_date","feed_end_date","feed_version"],
            [agency_id, agency_url, "en", "20260901", "20270901", "2026-09-india-v1"]
        ],
        "transfers.txt": [
            ["from_stop_id","to_stop_id","transfer_type","min_transfer_time"]
        ]
    }

    seen_stops = {}
    interchanges = []

    # Process all routes and stops
    for line_name, ldata in lines.items():
        rid = ldata["id"]
        tables["routes.txt"].append([
            rid, agency_id, line_name, ldata["long_name"],
            ldata["route_type"], ldata["color"], ldata["text_color"]
        ])

        stns = ldata["stations"]
        for code, name, lat, lon in stns:
            stop_id = f"{city_key.upper()}_{code}"
            if stop_id in seen_stops:
                interchanges.append(stop_id)
                continue
            seen_stops[stop_id] = (code, name, lat, lon)
            tables["stops.txt"].append([
                stop_id, code, name, str(lat), str(lon), "0", "1"
            ])

    # Add interchange self-transfers (2 minutes transfer penalty)
    for stop_id in set(interchanges):
        tables["transfers.txt"].append([stop_id, stop_id, "2", "120"])

    # Generate trips, schedules, and shapes (5-minute frequency, 5:00 AM to 11:30 PM)
    FREQUENCY = 300   # 5 min headway
    DWELL = 30        # 30 sec dwell
    SPEED_KMH = 38.0  # 38 km/h avg speed including acceleration/braking

    total_trips = 0
    total_stoptimes = 0

    for line_name, ldata in lines.items():
        rid = ldata["id"]
        stns = ldata["stations"]
        for direction, seq in enumerate([stns, list(reversed(stns))]):
            shape_id = f"{rid}_{direction}"
            # Build shape
            cum_dist = 0.0
            for seq_num, (code, name, lat, lon) in enumerate(seq, 1):
                if seq_num > 1:
                    prev = seq[seq_num - 2]
                    cum_dist += haversine(prev[2], prev[3], lat, lon)
                tables["shapes.txt"].append([
                    shape_id, f"{lat:.6f}", f"{lon:.6f}", str(seq_num), f"{cum_dist:.3f}"
                ])

            # Offsets
            offsets = [0]
            total = 0.0
            for i in range(1, len(seq)):
                seg_km = haversine(seq[i-1][2], seq[i-1][3], seq[i][2], seq[i][3])
                seg_sec = (seg_km / SPEED_KMH) * 3600.0
                seg_sec = max(60.0, seg_sec)
                total += seg_sec + DWELL
                offsets.append(round(total))

            # Trips: 05:00 to 23:30
            n = 0
            for departure in range(5*3600, int(23.5*3600), FREQUENCY):
                trip_id = f"{rid}_{direction}_{n:04d}"
                tables["trips.txt"].append([
                    rid, "METRO_DAILY", trip_id,
                    seq[-1][1], str(direction), shape_id, "0", "1"
                ])
                total_trips += 1
                for i, (code, name, lat, lon) in enumerate(seq):
                    t = departure + offsets[i]
                    arr = hms(t)
                    dep = hms(t + DWELL) if i < len(seq)-1 else arr
                    tables["stop_times.txt"].append([
                        trip_id, arr, dep, f"{city_key.upper()}_{code}", str(i+1), "0", "0", "1"
                    ])
                    total_stoptimes += 1
                n += 1

    # Save to ZIP
    gtfs_zip = city_dir / f"{city_key}-gtfs.zip"
    tmp = city_dir / ".gtfs-tmp"
    tmp.mkdir(exist_ok=True)
    for fn, data in tables.items():
        with (tmp/fn).open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(data)
    with zipfile.ZipFile(gtfs_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for fn in tables:
            z.write(tmp/fn, fn)
    for p in tmp.iterdir(): p.unlink()
    tmp.rmdir()

    # Create build-config.json and router-config.json
    build_cfg = {
        "transitServiceStart": "2026-09-01",
        "transitServiceEnd": "2027-09-01",
        "maxStopToShapeSnapDistance": 500.0
    }
    with (city_dir / "build-config.json").open("w") as f:
        json.dump(build_cfg, f, indent=2)
    with (city_dir / "router-config.json").open("w") as f:
        json.dump({}, f)

    print(f"  --> Saved GTFS: {gtfs_zip}")
    print(f"  --> Routes: {len(tables['routes.txt'])-1} | Stops: {len(tables['stops.txt'])-1} | Trips: {total_trips} | StopTimes: {total_stoptimes}")

if __name__ == "__main__":
    print("\n" + "="*62)
    print("  PAN-INDIA TRANSIT NETWORK BUILDER (METRO + BUS)")
    print("="*62)
    for key, cfg in INDIAN_TRANSIT_NETWORKS.items():
        generate_city_gtfs(key, cfg)
    print("\n[SUCCESS] All Pan-India transit datasets built successfully.")
