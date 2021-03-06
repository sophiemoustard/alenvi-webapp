<template>
  <q-page class="client-background" padding>
    <ni-directory-header title="Bénéficiaires" @update-search="updateSearch" :search="searchStr" />
    <ni-table-list :data="filteredUsers" :columns="columns" :pagination.sync="pagination" :loading="tableLoading"
      @go-to="goToCustomerProfile" :rows-per-page="[15, 50, 100, 200]" />
  </q-page>
</template>

<script>
import Customers from '@api/Customers';
import escapeRegExp from 'lodash/escapeRegExp';
import { formatIdentity, removeDiacritics, sortStrings } from '@helpers/utils';
import DirectoryHeader from '@components/DirectoryHeader';
import TableList from '@components/table/TableList';

export default {
  name: 'AuxiliaryCustomersDirectory',
  metaInfo: { title: 'Bénéficiaires' },
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-table-list': TableList,
  },
  data () {
    return {
      tableLoading: true,
      ownCustomers: true,
      customersList: [],
      searchStr: '',
      pagination: {
        sortBy: 'name',
        descending: false,
        page: 1,
        rowsPerPage: 15,
      },
      columns: [
        {
          name: 'name',
          label: 'Nom',
          field: 'identity',
          format: value => (value ? value.fullName : ''),
          align: 'left',
          sortable: true,
          sort: (a, b) => sortStrings(a.lastname, b.lastname),
        },
      ],
    };
  },
  async created () {
    await this.getCustomersList();
  },
  computed: {
    filteredUsers () {
      const formattedString = escapeRegExp(removeDiacritics(this.searchStr));
      return this.customersList
        .filter(customer => customer.identity.noDiacriticsName.match(new RegExp(formattedString, 'i')));
    },
  },
  methods: {
    updateSearch (value) {
      this.searchStr = value;
    },
    formatCustomer (customer) {
      const formattedName = formatIdentity(customer.identity, 'FL');

      return {
        identity: {
          ...customer.identity,
          fullName: formattedName,
          noDiacriticsName: removeDiacritics(formattedName),
        },
        customerId: customer._id,
      };
    },
    async getCustomersList () {
      try {
        this.tableLoading = true;
        const customers = await Customers.list();
        this.customersList = customers.map(customer => this.formatCustomer(customer));
        this.tableLoading = false;
      } catch (e) {
        this.tableLoading = false;
        console.error(e);
      }
    },
    goToCustomerProfile (row) {
      this.$router.push({ name: 'auxiliaries customers info', params: { customerId: row.customerId } });
    },
  },
};
</script>
