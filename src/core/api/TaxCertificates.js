import { Cookies } from 'quasar';
import { alenviAxios } from '@api/ressources/alenviAxios'

export default {
  async list (params) {
    const taxCertificates = await alenviAxios.get(`${process.env.API_HOSTNAME}/taxcertificates`, { params });
    return taxCertificates.data.data.taxCertificates;
  },
  getPDFUrl (id) {
    return `${process.env.API_HOSTNAME}/taxcertificates/${id}/pdfs?x-access-token=${Cookies.get('alenvi_token')}`;
  },
  async create (data) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/taxcertificates`, data);
  },
  async remove (id) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/taxcertificates/${id}`);
  },
}
