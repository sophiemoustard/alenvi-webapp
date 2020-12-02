<template>
  <div>
    <p class="text-weight-bold">Règle d'accès</p>
    <q-card>
      <ni-responsive-table :data="accessRules" :columns="columns" :pagination.sync="pagination"
        no-data-label="Pas de règle - la formation est en libre accès" :hide-bottom="!!accessRules.length">
        <template #body="{ props }">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
              :style="col.style">
              <template v-if="col.name === 'actions'">
                <div class="row no-wrap table-actions">
                  <ni-button icon="edit" disabled="true" />
                  <ni-button icon="delete" disabled="true" />
                </div>
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>
        </template>
      </ni-responsive-table>
      <q-card-actions align="right">
        <ni-button color="primary" icon="add" label="Ajouter une règle" :disable="tableLoading"
          @click="openAddAccessRuleModal" />
      </q-card-actions>
    </q-card>

    <access-rule-creation-modal v-model="accessRuleCreationModal" :loading="modalLoading" @submit="addAccessRule"
      :validations="$v.newAccessRule" @hide="resetAccessRuleCreationModal" :new-access-rule="newAccessRule"
      :company-options="companyOptions" />
  </div>
</template>

<script>
import get from 'lodash/get';
import { required } from 'vuelidate/lib/validators';
import { mapState } from 'vuex';
import ResponsiveTable from '@components/table/ResponsiveTable';
import Button from '@components/Button';
import Companies from '@api/Companies';
import Courses from '@api/Courses';
import { formatAndSortOptions } from '@helpers/utils';
import AccessRuleCreationModal from 'src/modules/vendor/components/courses/AccessRuleCreationModal';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';

export default {
  name: 'ProfileAccess',
  components: {
    'ni-responsive-table': ResponsiveTable,
    'ni-button': Button,
    'access-rule-creation-modal': AccessRuleCreationModal,
  },
  props: {
    profileId: { type: String, required: true },
  },
  computed: {
    ...mapState('course', ['course']),
    accessRules () {
      return this.course.accessRules || [];
    },
  },
  data () {
    return {
      tableLoading: false,
      columns: [
        { name: 'name', label: 'Structure', align: 'left', field: 'name', style: 'width: 85%' },
        { name: 'actions', label: '', field: '_id' },
      ],
      pagination: { sortBy: 'name', ascending: true, page: 1, rowsPerPage: 50 },
      newAccessRule: { company: '' },
      companyOptions: [],
      accessRuleCreationModal: false,
      modalLoading: false,
    };
  },
  validations () {
    return {
      newAccessRule: { company: { required } },
    };
  },
  methods: {
    async refreshCourse () {
      try {
        await this.$store.dispatch('course/fetchCourse', { courseId: this.profileId });
      } catch (e) {
        console.error(e);
      }
    },
    async openAddAccessRuleModal () {
      try {
        const companies = await Companies.list();
        const companiesWithoutAccessRules = companies.filter(
          c => !this.accessRules.map(ar => ar.name).includes(c.name)
        );

        this.companyOptions = formatAndSortOptions(companiesWithoutAccessRules, 'name');
        this.accessRuleCreationModal = true;
      } catch (e) {
        console.error(e);
        this.accessRuleCreationModal = false;
        this.companyOptions = [];
      }
    },
    resetAccessRuleCreationModal () {
      this.companyOptions = [];
      this.newAccessRule = { company: '' };
      this.$v.newAccessRule.$reset();
    },
    async addAccessRule () {
      try {
        this.$v.newAccessRule.$touch();
        if (this.$v.newAccessRule.company.$error) return NotifyWarning('Une règle d\'accès est requise');

        this.modalLoading = true;
        await Courses.addAccessRule(this.profileId, { company: get(this.newAccessRule, 'company') });

        this.accessRuleCreationModal = false;
        NotifyPositive('Règle d\'accès créée.');

        this.refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de la règle d\'accès.');
      } finally {
        this.modalLoading = false;
      }
    },
  },
};
</script>