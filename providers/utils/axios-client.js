import axios from 'axios';

// Create a custom Axios instance with default headers
export const client = axios.create({
    baseURL: 'https://animeworld-india.me',
  headers: {
    'Cookie': 'cf_clearance=ifPD43S.p5qBOB_tLtlIWDPUepKqTU8JglJIgbDHUvE-1750264146-1.2.1.1-Yj6rf6TybHuGqJDjhtW88azV2qPDe_xBfke59pSR.o5v2dSUg6myvOmZ9I9D1J5bG_LU0GXlTpXLOctWp4Ao2hthSDqkwMzslB_M15swwFUEYeBvwB3MrxLXVx_evCT8RXEmWIhZBkJTiyUlegDivTaxbIEN2E7ZbaFbumPa2lpDkos0USLjqOYsBrfcSN1G8JlT.SXnbW7LJdHC8wR3Wri3c2wbEqZI6rLahEJ81l.HKbSAT1LIcB1Nn0Vn.1DxL53Jj0SKRkAc4l7yBpkrZ9XybXRc79onOb6_pB2gEUBtBsqOsTrpQ5tzsgFHuiCknKw1LHKohHvCJKND25Ev0rUL8il5uL5PZxFltlnsAtM',
    'Referer': 'https://animeworld-india.me/',
    'Sec-Ch-Ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  }
});