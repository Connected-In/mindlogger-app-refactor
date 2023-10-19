import axios from 'axios';

//import { API_URL } from '@shared/lib';

const httpService = axios.create({
  baseURL: 'https://api-stage.cmiml.net', //  API_URL,
  withCredentials: true,
});

httpService.defaults.headers.common['Content-Type'] = 'application/json';

export default httpService;
