<template>
  <q-page padding class="client-background">
    <ni-title-header title="Documents" class="q-mb-xl" />
    <p v-if="documents.length == 0">Aucun document disponible</p>
    <ni-simple-table :data="documents" :columns="columns" :pagination.sync="pagination" row-key="name"
      :loading="loading">
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td :props="props" v-for="col in props.cols" :key="col.name" :data-label="col.label" :class="col.name"
            :style="col.style">
            <template v-if="col.name === 'actions'">
              <div class="row justify-center table-actions">
                <q-btn flat round small color="primary" class="q-mx-sm" :disable="!getDriveFileLink(props)" type="a"
                  :href="getDriveFileLink(props)" target="_blank" icon="file_download" />
              </div>
            </template>
            <template v-else>
              {{ col.value }}
            </template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
  </q-page>
</template>

<script>
import get from 'lodash/get';
import AdministrativeDocument from '@api/AdministrativeDocuments';
import TitleHeader from '@components/TitleHeader';
import SimpleTable from '@components/table/SimpleTable';

export default {
  metaInfo: { title: 'Documents' },
  components: {
    'ni-title-header': TitleHeader,
    'ni-simple-table': SimpleTable,
  },
  async mounted () {
    try {
      this.loading = true;
      this.documents = await AdministrativeDocument.list();
    } catch (e) {
      console.error(e);
      this.documents = [];
    } finally {
      this.loading = false;
    }
  },
  methods: {
    getDriveFileLink (doc) {
      return get(doc, 'row.driveFile.link', '');
    },
  },
  data () {
    return {
      pagination: { sortBy: 'title', descending: false, rowsPerPage: 0 },
      loading: false,
      columns: [
        { name: 'name', label: 'Nom', field: 'name', align: 'left' },
        { name: 'actions', align: 'center' },
      ],
      documents: [],
    };
  },
};
</script>
