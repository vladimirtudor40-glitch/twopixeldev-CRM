"""Descarcă din OpenStreetMap (Overpass API) localurile de pe litoral pentru categoriile non-cazare."""
import json, sys, time, urllib.request, urllib.parse

BBOX = "43.95,28.45,44.40,28.75"
Q = f"""
[out:json][timeout:180];
(
  nwr["shop"~"^(hairdresser|beauty|massage|cosmetics|tattoo)$"]({BBOX});
  nwr["amenity"~"^(spa|restaurant|cafe|bar|pub|biergarten|fast_food|ice_cream|nightclub|cinema|boat_rental|dive_centre|casino)$"]({BBOX});
  nwr["leisure"~"^(spa|water_park|amusement_arcade|escape_game|bowling_alley|miniature_golf|trampoline_park|horse_riding|sports_centre|fitness_centre|beach_resort|marina|dance|sauna|adult_gaming_centre)$"]({BBOX});
  nwr["tourism"~"^(theme_park|zoo|aquarium|museum|gallery|attraction)$"]({BBOX});
  nwr["sport"~"^(karting|paintball|scuba_diving|climbing|shooting|surfing|kitesurfing|windsurfing|water_ski|wakeboarding|equestrian|horse_riding|bowling|10pin)$"]({BBOX});
  nwr["shop"="travel_agency"]({BBOX});
  nwr["office"="travel_agent"]({BBOX});
);
out center tags;
"""
SERVERS = ["https://overpass-api.de/api/interpreter",
           "https://overpass.kumi.systems/api/interpreter",
           "https://overpass.private.coffee/api/interpreter"]
for attempt in range(6):
    url = SERVERS[attempt % len(SERVERS)]
    try:
        data = urllib.parse.urlencode({"data": Q}).encode()
        req = urllib.request.Request(url, data=data, headers={"User-Agent": "twopixeldev-crm-leads/1.0"})
        with urllib.request.urlopen(req, timeout=240) as r:
            body = json.load(r)
        print(url, len(body["elements"]), "elemente")
        json.dump(body, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False)
        break
    except Exception as e:
        print("eroare", url, e); time.sleep(20)
else:
    sys.exit(1)
