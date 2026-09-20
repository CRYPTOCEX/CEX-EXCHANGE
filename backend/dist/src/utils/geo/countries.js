"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEO_HEADER_SENTINELS = exports.ALL_COUNTRIES = void 0;
exports.toAlpha2 = toAlpha2;
exports.getCountry = getCountry;
exports.getCountryName = getCountryName;
exports.isValidCountry = isValidCountry;
const COUNTRY_TABLE = [
    "AF|AFG|Afghanistan", "AX|ALA|Aland Islands", "AL|ALB|Albania",
    "DZ|DZA|Algeria", "AS|ASM|American Samoa", "AD|AND|Andorra",
    "AO|AGO|Angola", "AI|AIA|Anguilla", "AQ|ATA|Antarctica",
    "AG|ATG|Antigua and Barbuda", "AR|ARG|Argentina", "AM|ARM|Armenia",
    "AW|ABW|Aruba", "AU|AUS|Australia", "AT|AUT|Austria",
    "AZ|AZE|Azerbaijan", "BH|BHR|Bahrain", "BD|BGD|Bangladesh",
    "BB|BRB|Barbados", "BY|BLR|Belarus", "BE|BEL|Belgium",
    "BZ|BLZ|Belize", "BJ|BEN|Benin", "BM|BMU|Bermuda",
    "BT|BTN|Bhutan", "BO|BOL|Bolivia", "BQ|BES|Bonaire, Sint Eustatius and Saba",
    "BA|BIH|Bosnia and Herzegovina", "BW|BWA|Botswana", "BV|BVT|Bouvet Island",
    "BR|BRA|Brazil", "IO|IOT|British Indian Ocean Territory", "BN|BRN|Brunei",
    "BG|BGR|Bulgaria", "BF|BFA|Burkina Faso", "BI|BDI|Burundi",
    "KH|KHM|Cambodia", "CM|CMR|Cameroon", "CA|CAN|Canada",
    "CV|CPV|Cape Verde", "KY|CYM|Cayman Islands", "CF|CAF|Central African Republic",
    "TD|TCD|Chad", "CL|CHL|Chile", "CN|CHN|China",
    "CX|CXR|Christmas Island", "CC|CCK|Cocos (Keeling) Islands", "CO|COL|Colombia",
    "KM|COM|Comoros", "CG|COG|Congo", "CK|COK|Cook Islands",
    "CR|CRI|Costa Rica", "HR|HRV|Croatia", "CU|CUB|Cuba",
    "CW|CUW|Curaçao", "CY|CYP|Cyprus", "CZ|CZE|Czech Republic",
    "CD|COD|Democratic Republic of the Congo", "DK|DNK|Denmark", "DJ|DJI|Djibouti",
    "DM|DMA|Dominica", "DO|DOM|Dominican Republic", "EC|ECU|Ecuador",
    "EG|EGY|Egypt", "SV|SLV|El Salvador", "GQ|GNQ|Equatorial Guinea",
    "ER|ERI|Eritrea", "EE|EST|Estonia", "SZ|SWZ|Eswatini",
    "ET|ETH|Ethiopia", "FK|FLK|Falkland Islands", "FO|FRO|Faroe Islands",
    "FJ|FJI|Fiji Islands", "FI|FIN|Finland", "FR|FRA|France",
    "GF|GUF|French Guiana", "PF|PYF|French Polynesia", "TF|ATF|French Southern Territories",
    "GA|GAB|Gabon", "GE|GEO|Georgia", "DE|DEU|Germany",
    "GH|GHA|Ghana", "GI|GIB|Gibraltar", "GR|GRC|Greece",
    "GL|GRL|Greenland", "GD|GRD|Grenada", "GP|GLP|Guadeloupe",
    "GU|GUM|Guam", "GT|GTM|Guatemala", "GG|GGY|Guernsey",
    "GN|GIN|Guinea", "GW|GNB|Guinea-Bissau", "GY|GUY|Guyana",
    "HT|HTI|Haiti", "HM|HMD|Heard Island and McDonald Islands", "HN|HND|Honduras",
    "HK|HKG|Hong Kong S.A.R.", "HU|HUN|Hungary", "IS|ISL|Iceland",
    "IN|IND|India", "ID|IDN|Indonesia", "IR|IRN|Iran",
    "IQ|IRQ|Iraq", "IE|IRL|Ireland", "IL|ISR|Israel",
    "IT|ITA|Italy", "CI|CIV|Ivory Coast", "JM|JAM|Jamaica",
    "JP|JPN|Japan", "JE|JEY|Jersey", "JO|JOR|Jordan",
    "KZ|KAZ|Kazakhstan", "KE|KEN|Kenya", "KI|KIR|Kiribati",
    "XK|XKX|Kosovo", "KW|KWT|Kuwait", "KG|KGZ|Kyrgyzstan",
    "LA|LAO|Laos", "LV|LVA|Latvia", "LB|LBN|Lebanon",
    "LS|LSO|Lesotho", "LR|LBR|Liberia", "LY|LBY|Libya",
    "LI|LIE|Liechtenstein", "LT|LTU|Lithuania", "LU|LUX|Luxembourg",
    "MO|MAC|Macau S.A.R.", "MG|MDG|Madagascar", "MW|MWI|Malawi",
    "MY|MYS|Malaysia", "MV|MDV|Maldives", "ML|MLI|Mali",
    "MT|MLT|Malta", "IM|IMN|Man (Isle of)", "MH|MHL|Marshall Islands",
    "MQ|MTQ|Martinique", "MR|MRT|Mauritania", "MU|MUS|Mauritius",
    "YT|MYT|Mayotte", "MX|MEX|Mexico", "FM|FSM|Micronesia",
    "MD|MDA|Moldova", "MC|MCO|Monaco", "MN|MNG|Mongolia",
    "ME|MNE|Montenegro", "MS|MSR|Montserrat", "MA|MAR|Morocco",
    "MZ|MOZ|Mozambique", "MM|MMR|Myanmar", "NA|NAM|Namibia",
    "NR|NRU|Nauru", "NP|NPL|Nepal", "NL|NLD|Netherlands",
    "NC|NCL|New Caledonia", "NZ|NZL|New Zealand", "NI|NIC|Nicaragua",
    "NE|NER|Niger", "NG|NGA|Nigeria", "NU|NIU|Niue",
    "NF|NFK|Norfolk Island", "KP|PRK|North Korea", "MK|MKD|North Macedonia",
    "MP|MNP|Northern Mariana Islands", "NO|NOR|Norway", "OM|OMN|Oman",
    "PK|PAK|Pakistan", "PW|PLW|Palau", "PS|PSE|Palestinian Territory Occupied",
    "PA|PAN|Panama", "PG|PNG|Papua New Guinea", "PY|PRY|Paraguay",
    "PE|PER|Peru", "PH|PHL|Philippines", "PN|PCN|Pitcairn Island",
    "PL|POL|Poland", "PT|PRT|Portugal", "PR|PRI|Puerto Rico",
    "QA|QAT|Qatar", "RE|REU|Reunion", "RO|ROU|Romania",
    "RU|RUS|Russia", "RW|RWA|Rwanda", "SH|SHN|Saint Helena",
    "KN|KNA|Saint Kitts and Nevis", "LC|LCA|Saint Lucia", "PM|SPM|Saint Pierre and Miquelon",
    "VC|VCT|Saint Vincent and the Grenadines", "BL|BLM|Saint-Barthelemy", "MF|MAF|Saint-Martin (French part)",
    "WS|WSM|Samoa", "SM|SMR|San Marino", "ST|STP|Sao Tome and Principe",
    "SA|SAU|Saudi Arabia", "SN|SEN|Senegal", "RS|SRB|Serbia",
    "SC|SYC|Seychelles", "SL|SLE|Sierra Leone", "SG|SGP|Singapore",
    "SX|SXM|Sint Maarten (Dutch part)", "SK|SVK|Slovakia", "SI|SVN|Slovenia",
    "SB|SLB|Solomon Islands", "SO|SOM|Somalia", "ZA|ZAF|South Africa",
    "GS|SGS|South Georgia", "KR|KOR|South Korea", "SS|SSD|South Sudan",
    "ES|ESP|Spain", "LK|LKA|Sri Lanka", "SD|SDN|Sudan",
    "SR|SUR|Suriname", "SJ|SJM|Svalbard and Jan Mayen Islands", "SE|SWE|Sweden",
    "CH|CHE|Switzerland", "SY|SYR|Syria", "TW|TWN|Taiwan",
    "TJ|TJK|Tajikistan", "TZ|TZA|Tanzania", "TH|THA|Thailand",
    "BS|BHS|The Bahamas", "GM|GMB|The Gambia", "TL|TLS|Timor-Leste",
    "TG|TGO|Togo", "TK|TKL|Tokelau", "TO|TON|Tonga",
    "TT|TTO|Trinidad and Tobago", "TN|TUN|Tunisia", "TR|TUR|Turkey",
    "TM|TKM|Turkmenistan", "TC|TCA|Turks and Caicos Islands", "TV|TUV|Tuvalu",
    "UG|UGA|Uganda", "UA|UKR|Ukraine", "AE|ARE|United Arab Emirates",
    "GB|GBR|United Kingdom", "US|USA|United States", "UM|UMI|United States Minor Outlying Islands",
    "UY|URY|Uruguay", "UZ|UZB|Uzbekistan", "VU|VUT|Vanuatu",
    "VA|VAT|Vatican City State (Holy See)", "VE|VEN|Venezuela", "VN|VNM|Vietnam",
    "VG|VGB|Virgin Islands (British)", "VI|VIR|Virgin Islands (US)", "WF|WLF|Wallis and Futuna Islands",
    "EH|ESH|Western Sahara", "YE|YEM|Yemen", "ZM|ZMB|Zambia",
    "ZW|ZWE|Zimbabwe",
];
const BY_ALPHA2 = new Map();
const BY_ALPHA3 = new Map();
const BY_NAME = new Map();
for (const row of COUNTRY_TABLE) {
    const [alpha2, alpha3, name] = row.split("|");
    const record = { alpha2, alpha3, name };
    BY_ALPHA2.set(alpha2, record);
    BY_ALPHA3.set(alpha3, record);
    BY_NAME.set(name.toUpperCase(), record);
}
exports.ALL_COUNTRIES = COUNTRY_TABLE.map((row) => {
    const [alpha2, alpha3, name] = row.split("|");
    return { alpha2, alpha3, name };
});
exports.GEO_HEADER_SENTINELS = new Set(["XX", "T1"]);
function toAlpha2(value) {
    var _a, _b;
    var _c, _d;
    if (typeof value !== "string")
        return null;
    const raw = value.trim();
    if (!raw)
        return null;
    const upper = raw.toUpperCase();
    if (exports.GEO_HEADER_SENTINELS.has(upper))
        return null;
    if (upper.length === 2)
        return BY_ALPHA2.has(upper) ? upper : null;
    if (upper.length === 3)
        return (_c = (_a = BY_ALPHA3.get(upper)) === null || _a === void 0 ? void 0 : _a.alpha2) !== null && _c !== void 0 ? _c : null;
    return (_d = (_b = BY_NAME.get(upper)) === null || _b === void 0 ? void 0 : _b.alpha2) !== null && _d !== void 0 ? _d : null;
}
function getCountry(value) {
    var _a;
    const alpha2 = toAlpha2(value);
    return alpha2 ? ((_a = BY_ALPHA2.get(alpha2)) !== null && _a !== void 0 ? _a : null) : null;
}
function getCountryName(value) {
    var _a;
    var _b;
    return (_b = (_a = getCountry(value)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null;
}
function isValidCountry(value) {
    return toAlpha2(value) !== null;
}
