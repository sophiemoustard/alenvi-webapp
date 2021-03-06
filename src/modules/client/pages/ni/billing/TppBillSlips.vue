<template>
  <q-page class="client-background q-pb-xl">
    <ni-title-header title="Bordereaux tiers payeurs" padding />
    <ni-simple-table :data="billSlipList" :columns="columns" row-key="name" :pagination.sync="pagination"
      :loading="loading">
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td :props="props" v-for="col in props.cols" :key="col.name" :data-label="col.label" :class="col.name"
            :style="col.style" class="text-capitalize">
            <template v-if="col.name === 'document'">
              <div class="row justify-center table-actions">
                <q-btn flat round small color="primary" @click="downloadBillSlip(col.value)" icon="file_download" />
              </div>
            </template>
            <template v-else>{{ col.value }}</template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
  </q-page>
</template>

<script>
import get from 'lodash/get';
import BillSlip from '@api/BillSlips';
import SimpleTable from '@components/table/SimpleTable';
import TitleHeader from '@components/TitleHeader';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import { formatPrice } from '@helpers/utils';
import moment from '@helpers/moment';
import { downloadDocx } from '@helpers/file';

export default {
  name: 'TppBillSlips',
  metaInfo: { title: 'Bordereaux tiers payeurs' },
  components: {
    'ni-simple-table': SimpleTable,
    'ni-title-header': TitleHeader,
  },
  data () {
    return {
      billSlipList: [],
      loading: false,
      columns: [
        { name: 'number', label: 'Numero', align: 'left', field: 'number' },
        {
          name: 'month',
          label: 'Mois',
          align: 'left',
          field: 'month',
          format: value => moment(value, 'MM-YYYY').format('MMMM YYYY'),
          sort: (a, b) => this.sortMonths(a, b),
        },
        {
          name: 'thirdPartyPayer',
          label: 'Tiers payeur',
          align: 'left',
          field: row => get(row, 'thirdPartyPayer.name') || '',
        },
        {
          name: 'netInclTaxes',
          label: 'Montant TTC',
          align: 'left',
          field: 'netInclTaxes',
          format: value => formatPrice(value),
        },
        { name: 'document', label: '', align: 'left', field: '_id' },
      ],
      pagination: {
        sortBy: 'month',
        descending: true,
        rowsPerPage: 0,
      },
    };
  },
  async mounted () {
    await this.refreshBillSlips();
  },
  methods: {
    sortMonths (a, b) {
      const aDate = new Date(a.substring(3), a.substring(0, 2));
      const bDate = new Date(b.substring(3), b.substring(0, 2));

      if (aDate > bDate) return 1;
      if (aDate < bDate) return -1;

      return 0;
    },
    async refreshBillSlips () {
      try {
        this.loading = true;
        this.billSlipList = await BillSlip.list();
        NotifyPositive('Bordereaux récupérés avec succès.');
      } catch (e) {
        this.billSlipList = [];
        NotifyNegative('Erreur lors de la récuperation des bordereaux.');
        console.error(e);
      } finally {
        this.loading = false;
      }
    },
    async downloadBillSlip (id) {
      try {
        const docx = await BillSlip.getDocx(id);
        downloadDocx(docx, 'bordereau.docx');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement des bordereaux.');
      }
    },
  },
};
</script>
