"""Best-effort city/country extraction from a free-text address, so the
marketplace can filter vendors by location without asking organizations to
re-enter what's already in their address."""

import re

# Countries we expect (plus common aliases), lowercase -> display name.
COUNTRIES = {
    "nigeria": "Nigeria",
    "ghana": "Ghana",
    "kenya": "Kenya",
    "rwanda": "Rwanda",
    "uganda": "Uganda",
    "tanzania": "Tanzania",
    "south africa": "South Africa",
    "egypt": "Egypt",
    "morocco": "Morocco",
    "ethiopia": "Ethiopia",
    "cameroon": "Cameroon",
    "senegal": "Senegal",
    "ivory coast": "Côte d'Ivoire",
    "cote d'ivoire": "Côte d'Ivoire",
    "côte d'ivoire": "Côte d'Ivoire",
    "benin": "Benin",
    "togo": "Togo",
    "zambia": "Zambia",
    "zimbabwe": "Zimbabwe",
    "botswana": "Botswana",
    "united kingdom": "United Kingdom",
    "uk": "United Kingdom",
    "england": "United Kingdom",
    "united states": "United States",
    "usa": "United States",
    "us": "United States",
    "canada": "Canada",
    "united arab emirates": "United Arab Emirates",
    "uae": "United Arab Emirates",
    "germany": "Germany",
    "france": "France",
    "netherlands": "Netherlands",
    "ireland": "Ireland",
    "india": "India",
}

# Well-known cities (and Nigerian states commonly written as the city),
# lowercase -> (display city, country). Lets "…, Lagos" resolve even when
# the country is left out.
CITIES = {
    "lagos": ("Lagos", "Nigeria"),
    "abuja": ("Abuja", "Nigeria"),
    "fct": ("Abuja", "Nigeria"),
    "port harcourt": ("Port Harcourt", "Nigeria"),
    "ibadan": ("Ibadan", "Nigeria"),
    "kano": ("Kano", "Nigeria"),
    "benin city": ("Benin City", "Nigeria"),
    "enugu": ("Enugu", "Nigeria"),
    "kaduna": ("Kaduna", "Nigeria"),
    "abeokuta": ("Abeokuta", "Nigeria"),
    "owerri": ("Owerri", "Nigeria"),
    "uyo": ("Uyo", "Nigeria"),
    "calabar": ("Calabar", "Nigeria"),
    "jos": ("Jos", "Nigeria"),
    "ilorin": ("Ilorin", "Nigeria"),
    "warri": ("Warri", "Nigeria"),
    "asaba": ("Asaba", "Nigeria"),
    "accra": ("Accra", "Ghana"),
    "kumasi": ("Kumasi", "Ghana"),
    "nairobi": ("Nairobi", "Kenya"),
    "mombasa": ("Mombasa", "Kenya"),
    "kigali": ("Kigali", "Rwanda"),
    "kampala": ("Kampala", "Uganda"),
    "dar es salaam": ("Dar es Salaam", "Tanzania"),
    "johannesburg": ("Johannesburg", "South Africa"),
    "cape town": ("Cape Town", "South Africa"),
    "cairo": ("Cairo", "Egypt"),
    "london": ("London", "United Kingdom"),
    "dubai": ("Dubai", "United Arab Emirates"),
}


def _norm(text):
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s'’-]", " ", text)).strip().lower()


def _find(phrases, haystack):
    """Return the longest phrase found in haystack as a whole word, with its
    position, or (None, -1)."""
    best, best_pos = None, -1
    for phrase in sorted(phrases, key=len, reverse=True):
        m = re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", haystack)
        if m and (best is None or len(phrase) > len(best)):
            best, best_pos = phrase, m.start()
    return best, best_pos


def parse_location(address):
    """Return (city, country) guessed from an address; either may be ""."""
    if not address:
        return "", ""
    text = _norm(address)
    if not text:
        return "", ""

    country_key, country_pos = _find(COUNTRIES, text)
    country = COUNTRIES.get(country_key, "")

    # Prefer a known city; ignore matches inside the country name itself.
    city_key, _ = _find(CITIES, text)
    if city_key:
        city, city_country = CITIES[city_key]
        # "Benin City" contains "benin": the city match wins.
        if country_key and country_key in city_key:
            country = city_country
        if not country:
            country = city_country
        if city_country == country:
            return city, country

    if not country:
        return "", ""

    # Unknown city: take the word(s) just before the country, from the same
    # comma-separated part ("Ojota, Lagos Nigeria" -> "Lagos") or the part
    # before it ("Ikeja, Nigeria" -> "Ikeja").
    parts = [p.strip() for p in re.split(r"[,\n]", address) if p.strip()]
    for i in range(len(parts) - 1, -1, -1):
        norm_part = _norm(parts[i])
        if country_key and re.search(
            rf"(?<!\w){re.escape(country_key)}(?!\w)", norm_part
        ):
            before = re.sub(
                rf"(?<!\w){re.escape(country_key)}(?!\w)", "", norm_part
            ).strip()
            if before:
                return before.split(" ")[-1].title(), country
            if i > 0:
                prev = parts[i - 1].strip(" .")
                if prev and not re.search(r"\d", prev):
                    return prev.title(), country
            break
    return "", country
