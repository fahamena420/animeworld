import axios from 'axios';

// Create a custom Axios instance with default headers
export const client = axios.create({
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'max-age=0',
    'Cookie': 'cf_clearance=ifPD43S.p5qBOB_tLtlIWDPUepKqTU8JglJIgbDHUvE-1750264146-1.2.1.1-Yj6rf6TybHuGqJDjhtW88azV2qPDe_xBfke59pSR.o5v2dSUg6myvOmZ9I9D1J5bG_LU0GXlTpXLOctWp4Ao2hthSDqkwMzslB_M15swwFUEYeBvwB3MrxLXVx_evCT8RXEmWIhZBkJTiyUlegDivTaxbIEN2E7ZbaFbumPa2lpDkos0USLjqOYsBrfcSN1G8JlT.SXnbW7LJdHC8wR3Wri3c2wbEqZI6rLahEJ81l.HKbSAT1LIcB1Nn0Vn.1DxL53Jj0SKRkAc4l7yBpkrZ9XybXRc79onOb6_pB2gEUBtBsqOsTrpQ5tzsgFHuiCknKw1LHKohHvCJKND25Ev0rUL8il5uL5PZxFltlnsAtM',
    'If-Modified-Since': 'Wed, 18 Jun 2025 16:22:13 GMT',
    'Priority': 'u=0, i',
    'Referer': 'https://animeworld-india.me/',
    'Sec-Ch-Ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
  }
});
