<template>
  <q-page class="client-background" padding>
    <div v-if="company">
      <h4>Configuration bénéficiaires</h4>
      <div class="q-mb-xl">
        <p class="text-weight-bold">Plans de majoration</p>
        <q-card>
          <ni-responsive-table :data="surcharges" :columns="surchargesColumns" :pagination.sync="pagination"
            :loading="surchargesLoading">
            <template #body="{ props }">
              <q-tr :props="props">
                <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                  :style="col.style">
                  <template v-if="col.name === 'actions'">
                    <div class="row no-wrap table-actions">
                      <q-btn flat round small dense color="grey" icon="edit"
                        @click.native="openSurchargeEditionModal(col.value)" />
                      <q-btn flat round small dense color="grey" icon="delete"
                        @click="validateSurchargeDeletion(col.value, props.row)" />
                    </div>
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
              </q-tr>
            </template>
          </ni-responsive-table>
          <q-card-actions align="right">
            <q-btn no-caps flat color="primary" icon="add" label="Ajouter un plan de majoration"
              @click="surchargeCreationModal = true" :disable="surchargesLoading" />
          </q-card-actions>
        </q-card>
      </div>
      <div class="q-mb-xl">
        <p class="text-weight-bold">Services</p>
        <q-card>
          <ni-responsive-table :data="services" :columns="serviceColumns" :pagination.sync="pagination"
            :visible-columns="servicesVisibleColumns" :loading="servicesLoading">
            <template #body="{ props }">
              <q-tr :props="props">
                <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                  :style="col.style">
                  <template v-if="col.name === 'actions'">
                    <div class="row no-wrap table-actions">
                      <ni-btn icon="history" @click="showHistory(col.value)" />
                      <ni-btn v-if="!props.row.isArchived" icon="edit" @click="openServiceEditionModal(col.value)" />
                      <ni-btn v-if="props.row.subscriptionCount === 0" icon="delete"
                        @click="validateServiceDeletion(col.value, props.row)" />
                      <ni-btn v-else-if="!props.row.isArchived" icon="mdi-archive"
                        @click="validateServiceArchiving(col.value)" />
                      <div class="archived" v-else>archivé</div>
                    </div>
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
              </q-tr>
            </template>
          </ni-responsive-table>
          <q-card-actions align="right">
            <q-btn no-caps flat color="primary" icon="add" label="Ajouter un service"
              @click="serviceCreationModal = true" :disable="servicesLoading" />
          </q-card-actions>
        </q-card>
      </div>
      <div class="q-mb-xl">
        <p class="text-weight-bold">Documents</p>
        <div class="row gutter-profile">
          <div class="col-xs-12 col-md-6">
            <ni-file-uploader caption="Mandat de prélèvement" path="customersConfig.templates.debitMandate"
              :entity="company" alt="template mandat prelevement" name="debitMandate" :url="docsUploadUrl" drive-storage
              @uploaded="documentUploaded" :additional-value="`modele_mandat_prelevement_${company.name}`"
              @delete="validateDocumentDeletion(
                company.customersConfig.templates.debitMandate.driveId,
                'debitMandate',
                'customersConfig'
              )" />
          </div>
          <div class="col-xs-12 col-md-6">
            <ni-file-uploader caption="Devis" path="customersConfig.templates.quote" alt="template devis" name="quote"
              @uploaded="documentUploaded" :additional-value="`modele_devis_${company.name}`" :url="docsUploadUrl"
              drive-storage :entity="company" @delete="validateDocumentDeletion(
                company.customersConfig.templates.quote.driveId,
                'quote',
                'customersConfig'
              )" />
          </div>
        </div>
      </div>
      <div class="q-mb-xl">
        <p class="text-weight-bold">Tiers payeurs</p>
        <q-card>
          <ni-responsive-table :data="thirdPartyPayers" :columns="thirdPartyPayersColumns" :loading="tppsLoading"
            :pagination.sync="pagination">
            <template #body="{ props }">
              <q-tr :props="props">
                <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                  :style="col.style">
                  <template v-if="col.name === 'billingMode'">
                    <div class="capitalize">{{ col.value }}</div>
                  </template>
                  <template v-else-if="col.name === 'actions'">
                    <div class="row no-wrap table-actions">
                      <q-btn flat round small dense color="grey" icon="edit"
                        @click="openThirdPartyPayerEditionModal(col.value)" />
                      <q-btn :disable="isTppUsedInFundings(props.row)" flat round small dense color="grey"
                        icon="delete" @click="validateTppDeletion(col.value, props.row)" />
                    </div>
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
              </q-tr>
            </template>
          </ni-responsive-table>
          <q-card-actions align="right">
            <q-btn no-caps flat color="primary" icon="add" label="Ajouter un tiers payeur"
              @click="thirdPartyPayerCreationModal = true" :disable="tppsLoading" />
          </q-card-actions>
        </q-card>
      </div>
      <div class="q-mb-xl">
        <p class="text-weight-bold">Facturation</p>
        <div class="row gutter-profile">
          <ni-select caption="Période de facturation par défaut" v-model="company.customersConfig.billingPeriod" in-form
            @focus="saveTmp('customersConfig.billingPeriod')" @blur="updateCompany('customersConfig.billingPeriod')"
            :options="billingPeriodOptions" :error="$v.company.customersConfig.billingPeriod.$error"
            :error-message="REQUIRED_LABEL" />
        </div>
      </div>
    </div>

    <!-- Surcharge creation modal -->
    <surcharge-creation-modal v-model="surchargeCreationModal" :new-surcharge.sync="newSurcharge"
      :validations="$v.newSurcharge" @hide="resetCreationSurchargeData" @submit="createNewSurcharge"
      :loading="loading" />

    <!-- Surcharge edition modal -->
    <surcharge-edition-modal v-model="surchargeEditionModal" :edited-surcharge.sync="editedSurcharge"
      :validations="$v.editedSurcharge" @hide="resetEditionSurchargeData" @submit="updateSurcharge"
      :loading="loading" />

    <!-- Service creation modal -->
    <service-creation-modal v-model="serviceCreationModal" :new-service.sync="newService" :validations="$v.newService"
      :nature-options="natureOptions" :default-unit-amount-error="nbrError('newService.defaultUnitAmount')"
      :surcharges-options="surchargesOptions" @hide="resetCreationServiceData" @submit="createNewService"
      :loading="loading" />

    <!-- Service edition modal -->
    <service-edition-modal v-model="serviceEditionModal" :edited-service.sync="editedService"
      :default-unit-amount-error="nbrError('newService.defaultUnitAmount')" :surcharges-options="surchargesOptions"
      :loading="loading" @hide="resetEditionServiceData" @submit="updateService" :min-start-date="minStartDate"
      :validations="$v.editedService" />

    <!-- Service history modal -->
    <service-history-modal v-model="serviceHistoryModal" @hide="resetServiceHistoryData"
      :selected-service="selectedService" :service-columns="serviceColumns" />

    <!-- Third party payers creation modal -->
    <third-party-payer-creation-modal v-model="thirdPartyPayerCreationModal"
      :validations="$v.newThirdPartyPayer" @hide="resetThirdPartyPayerCreation" @submit="createNewThirdPartyPayer"
      :loading="loading" :billing-mode-options="billingModeOptions" :new-third-party-payer.sync="newThirdPartyPayer" />

    <!-- Third party payers edition modal -->
    <third-party-payer-edition-modal v-model="thirdPartyPayerEditionModal" @submit="updateThirdPartyPayer"
      :edited-third-party-payer.sync="editedThirdPartyPayer" :validations="$v.editedThirdPartyPayer"
      @hide="resetThirdPartyPayerEdition" :loading="loading" :billing-mode-options="billingModeOptions" />
  </q-page>
</template>

<script>
import capitalize from 'lodash/capitalize';
import cloneDeep from 'lodash/cloneDeep';
import pickBy from 'lodash/pickBy';
import pick from 'lodash/pick';
import get from 'lodash/get';
import omit from 'lodash/omit';
import { required, numeric, requiredIf, email } from 'vuelidate/lib/validators';
import Services from '@api/Services';
import Surcharges from '@api/Surcharges';
import ThirdPartyPayers from '@api/ThirdPartyPayers';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import FileUploader from '@components/form/FileUploader';
import Button from '@components/Button';
import Select from '@components/form/Select';
import ReponsiveTable from '@components/table/ResponsiveTable';
import {
  BILLING_DIRECT,
  BILLING_INDIRECT,
  TWO_WEEKS,
  MONTH,
  NATURE_OPTIONS,
  FIXED,
  COMPANY,
  REQUIRED_LABEL,
} from '@data/constants';
import moment from '@helpers/moment';
import { roundFrenchPercentage, formatHoursWithMinutes } from '@helpers/utils';
import { frAddress, positiveNumber } from '@helpers/vuelidateCustomVal';
import { validationMixin } from '@mixins/validationMixin';
import ServiceCreationModal from 'src/modules/client/components/config/ServiceCreationModal';
import ServiceEditionModal from 'src/modules/client/components/config/ServiceEditionModal';
import SurchargeCreationModal from 'src/modules/client/components/config/SurchargeCreationModal';
import SurchargeEditionModal from 'src/modules/client/components/config/SurchargeEditionModal';
import ThirdPartyPayerCreationModal from 'src/modules/client/components/config/ThirdPartyPayerCreationModal';
import ThirdPartyPayerEditionModal from 'src/modules/client/components/config/ThirdPartyPayerEditionModal';
import ServiceHistoryModal from 'src/modules/client/components/config/ServiceHistoryModal';
import { configMixin } from 'src/modules/client/mixins/configMixin';
import { tableMixin } from 'src/modules/client/mixins/tableMixin';

export default {
  name: 'CustomersConfig',
  metaInfo: { title: 'Configuration bénéficiaire' },
  components: {
    'ni-file-uploader': FileUploader,
    'ni-select': Select,
    'ni-btn': Button,
    'ni-responsive-table': ReponsiveTable,
    'service-creation-modal': ServiceCreationModal,
    'service-edition-modal': ServiceEditionModal,
    'surcharge-creation-modal': SurchargeCreationModal,
    'surcharge-edition-modal': SurchargeEditionModal,
    'third-party-payer-creation-modal': ThirdPartyPayerCreationModal,
    'third-party-payer-edition-modal': ThirdPartyPayerEditionModal,
    'service-history-modal': ServiceHistoryModal,
  },
  mixins: [configMixin, validationMixin, tableMixin],
  watch: {
    'editedSurcharge.evening': function (value) {
      if (!value) {
        this.editedSurcharge.eveningStartTime = null;
        this.editedSurcharge.eveningEndTime = null;
      }
    },
    'editedSurcharge.custom': function (value) {
      if (!value) {
        this.editedSurcharge.customStartTime = null;
        this.editedSurcharge.customEndTime = null;
      }
    },
    'newSurcharge.evening': function (value) {
      if (!value) {
        this.newSurcharge.eveningStartTime = null;
        this.newSurcharge.eveningEndTime = null;
      }
    },
    'newSurcharge.custom': function (value) {
      if (!value) {
        this.newSurcharge.customStartTime = null;
        this.newSurcharge.customEndTime = null;
      }
    },
  },
  data () {
    return {
      loading: false,
      FIXED,
      COMPANY,
      REQUIRED_LABEL,
      billingPeriodOptions: [
        { value: TWO_WEEKS, label: 'Quinzaine' },
        { value: MONTH, label: 'Mois' },
      ],
      // Surcharges
      surcharges: [],
      surchargeCreationModal: false,
      surchargeEditionModal: false,
      surchargesOptions: [],
      selectedSurcharge: {},
      newSurcharge: {
        name: '',
        saturday: '',
        sunday: '',
        publicHoliday: '',
        twentyFifthOfDecember: '',
        firstOfMay: '',
        firstOfJanuary: '',
        evening: '',
        eveningStartTime: null,
        eveningEndTime: null,
        custom: '',
        customStartTime: null,
        customEndTime: null,
      },
      editedSurcharge: {
        name: '',
        saturday: '',
        sunday: '',
        publicHoliday: '',
        twentyFifthOfDecember: '',
        firstOfMay: '',
        firstOfJanuary: '',
        evening: '',
        eveningStartTime: null,
        eveningEndTime: null,
        custom: '',
        customStartTime: null,
        customEndTime: null,
      },
      surchargesColumns: [
        { name: 'name', label: 'Nom', align: 'left', field: 'name' },
        {
          name: 'saturday',
          label: 'Samedi',
          align: 'center',
          field: row => roundFrenchPercentage(row.saturday, 0),
        },
        {
          name: 'sunday',
          label: 'Dimanche',
          align: 'center',
          field: row => roundFrenchPercentage(row.sunday, 0),
        },
        {
          name: 'publicHoliday',
          label: 'Jour férié',
          align: 'center',
          field: row => roundFrenchPercentage(row.publicHoliday, 0),
        },
        {
          name: 'twentyFifthOfDecember',
          label: '25 décembre',
          align: 'center',
          field: row => roundFrenchPercentage(row.twentyFifthOfDecember, 0),
        },
        {
          name: 'firstOfMay',
          label: '1er mai',
          align: 'center',
          field: row => roundFrenchPercentage(row.firstOfMay, 0),
        },
        {
          name: 'firstOfJanuary',
          label: '1er janvier',
          align: 'center',
          field: row => roundFrenchPercentage(row.firstOfJanuary, 0),
        },
        {
          name: 'evening',
          label: 'Soirée',
          align: 'center',
          field: row => roundFrenchPercentage(row.evening, 0),
        },
        {
          name: 'eveningStartTime',
          label: 'Début soirée',
          align: 'center',
          field: row => (row.eveningStartTime ? formatHoursWithMinutes(row.eveningStartTime) : ''),
        },
        {
          name: 'eveningEndTime',
          label: 'Fin soirée',
          align: 'center',
          field: row => (row.eveningEndTime ? formatHoursWithMinutes(row.eveningEndTime) : ''),
        },
        {
          name: 'custom',
          label: 'Perso',
          align: 'center',
          field: row => roundFrenchPercentage(row.custom, 0),
        },
        {
          name: 'customStartTime',
          label: 'Début perso',
          align: 'center',
          field: row => (row.customStartTime ? formatHoursWithMinutes(row.customStartTime) : ''),
        },
        {
          name: 'customEndTime',
          label: 'Fin perso',
          align: 'center',
          field: row => (row.customEndTime ? formatHoursWithMinutes(row.customEndTime) : ''),
        },
        { name: 'actions', label: '', align: 'center', field: '_id', style: 'padding-left: 0px' },
      ],
      surchargesLoading: false,
      // Services
      services: [],
      serviceCreationModal: false,
      serviceEditionModal: false,
      serviceHistoryModal: false,
      selectedService: {},
      newService: {
        name: '',
        nature: '',
        defaultUnitAmount: '',
        vat: '',
        surcharge: '',
        exemptFromCharges: false,
      },
      editedService: {
        name: '',
        startDate: '',
        defaultUnitAmount: '',
        vat: '',
        nature: '',
        surcharge: '',
        exemptFromCharges: false,
      },
      natureOptions: NATURE_OPTIONS,
      servicesVisibleColumns: [
        'name',
        'nature',
        'defaultUnitAmount',
        'vat',
        'surcharge',
        'exemptFromCharges',
        'actions',
      ],
      visibleHistoryColumns: ['startDate', 'name', 'defaultUnitAmount', 'vat', 'surcharge', 'exemptFromCharges'],
      serviceColumns: [
        {
          name: 'startDate',
          label: 'Date d\'effet',
          align: 'left',
          field: row => (row.startDate ? moment(row.startDate).format('DD/MM/YYYY') : ''),
        },
        { name: 'name', label: 'Nom', align: 'left', field: 'name' },
        {
          name: 'nature',
          label: 'Nature',
          align: 'left',
          format: (value) => {
            const nature = NATURE_OPTIONS.find(option => option.value === value);
            return nature ? capitalize(nature.label) : '';
          },
          field: 'nature',
        },
        {
          name: 'defaultUnitAmount',
          label: 'Prix unitaire TTC par défaut',
          align: 'center',
          field: 'defaultUnitAmount',
          format: value => `${value}€`,
        },
        {
          name: 'vat',
          label: 'TVA',
          align: 'center',
          field: row => row.vat && `${row.vat}%`,
        },
        {
          name: 'surcharge',
          label: 'Plan de majoration',
          align: 'left',
          field: row => (row.surcharge ? row.surcharge.name : ''),
        },
        {
          name: 'exemptFromCharges',
          label: 'Exonération de charges',
          align: 'center',
          field: row => (row.exemptFromCharges ? 'Oui' : 'Non'),
        },
        { name: 'actions', label: '', align: 'center', field: '_id' },
      ],
      servicesLoading: false,
      thirdPartyPayers: [],
      thirdPartyPayersColumns: [
        {
          name: 'name',
          label: 'Nom',
          field: 'name',
          align: 'left',
          sortable: true,
          style: !this.$q.platform.is.mobile && 'width: 250px',
        },
        { name: 'address', label: 'Adresse', align: 'left', field: row => get(row, 'address.fullAddress') || '' },
        { name: 'email', label: 'Email', field: 'email', align: 'left' },
        {
          name: 'unitTTCRate',
          label: 'Prix unitaire TTC par défaut',
          field: 'unitTTCRate',
          format: val => (val ? `${val}€` : ''),
          align: 'center',
        },
        {
          name: 'billingMode',
          label: 'Facturation',
          field: 'billingMode',
          align: 'center',
          format: (val) => {
            const mode = this.billingModeOptions.find(m => m.value === val);
            return mode ? mode.label : '';
          },
        },
        {
          name: 'teletransmissionId',
          label: 'ID de télétransmission',
          field: 'teletransmissionId',
          align: 'center',
          style: !this.$q.platform.is.mobile && 'word-break: break-word;',
        },
        {
          name: 'isApa',
          label: 'APA',
          field: 'isApa',
          align: 'center',
          format: val => (val ? 'Oui' : 'Non'),
          style: !this.$q.platform.is.mobile && 'width: 100px',
        },
        {
          name: 'actions',
          label: '',
          align: 'center',
          field: '_id',
          style: !this.$q.platform.is.mobile && 'width: 100px',
        },
      ],
      tppsLoading: false,
      thirdPartyPayerCreationModal: false,
      newThirdPartyPayer: {
        name: '',
        email: '',
        address: { fullAddress: '' },
        unitTTCRate: 0,
        billingMode: '',
        isApa: false,
        teletransmissionId: '',
      },
      billingModeOptions: [
        { label: 'Indirecte', value: BILLING_INDIRECT },
        { label: 'Directe', value: BILLING_DIRECT },
      ],
      thirdPartyPayerEditionModal: false,
      editedThirdPartyPayer: {
        address: {},
      },
      pagination: { rowsPerPage: 0 },
      paginationHistory: {
        rowsPerPage: 0,
        sortBy: 'startDate',
        descending: true,
      },
    };
  },
  validations: {
    newSurcharge: {
      name: { required },
      saturday: { positiveNumber },
      sunday: { positiveNumber },
      publicHoliday: { positiveNumber },
      twentyFifthOfDecember: { positiveNumber },
      firstOfMay: { positiveNumber },
      firstOfJanuary: { positiveNumber },
      evening: { positiveNumber },
      eveningStartTime: { required: requiredIf(item => item.evening) },
      eveningEndTime: { required: requiredIf(item => item.evening) },
      custom: { numeric },
      customStartTime: { required: requiredIf(item => item.custom) },
      customEndTime: { required: requiredIf(item => item.custom) },
    },
    editedSurcharge: {
      name: { required },
      saturday: { positiveNumber },
      sunday: { positiveNumber },
      publicHoliday: { positiveNumber },
      twentyFifthOfDecember: { positiveNumber },
      firstOfMay: { positiveNumber },
      firstOfJanuary: { positiveNumber },
      evening: { positiveNumber },
      eveningStartTime: { required: requiredIf(item => item.evening) },
      eveningEndTime: { required: requiredIf(item => item.evening) },
      custom: { numeric },
      customStartTime: { required: requiredIf(item => item.custom) },
      customEndTime: { required: requiredIf(item => item.custom) },
    },
    newService: {
      name: { required },
      nature: { required },
      defaultUnitAmount: { required, positiveNumber },
      vat: { positiveNumber },
    },
    editedService: {
      name: { required },
      startDate: { required },
      defaultUnitAmount: { required, positiveNumber },
      vat: { positiveNumber },
    },
    company: {
      customersConfig: {
        billingPeriod: { required },
      },
    },
    newThirdPartyPayer: {
      name: { required },
      address: {
        zipCode: { required: requiredIf(item => !!item.fullAddress) },
        street: { required: requiredIf(item => !!item.fullAddress) },
        city: { required: requiredIf(item => !!item.fullAddress) },
        fullAddress: { frAddress },
      },
      email: { email },
      billingMode: { required },
      unitTTCRate: { positiveNumber },
      isApa: { required },
    },
    editedThirdPartyPayer: {
      name: { required },
      address: {
        zipCode: { required: requiredIf(item => !!item.fullAddress) },
        street: { required: requiredIf(item => !!item.fullAddress) },
        city: { required: requiredIf(item => !!item.fullAddress) },
        fullAddress: { frAddress },
      },
      email: { email },
      billingMode: { required },
      unitTTCRate: { positiveNumber },
      isApa: { required },
    },
  },
  computed: {
    docsUploadUrl () {
      return `${process.env.API_HOSTNAME}/companies/${this.company._id}/gdrive/${this.company.folderId}/upload`;
    },
    minStartDate () {
      const selectedService = this.services.find(ser => ser._id === this.editedService._id);
      return selectedService ? moment(selectedService.startDate).add(1, 'd').toISOString() : '';
    },
  },
  async mounted () {
    await Promise.all([
      this.refreshCompany(),
      this.refreshSurcharges(),
      this.refreshServices(),
      this.refreshThirdPartyPayers(),
    ]);
  },
  methods: {
    // Refresh data
    async refreshSurcharges () {
      try {
        this.surchargesLoading = true;
        this.surchargesOptions = [];
        this.surcharges = await Surcharges.list();
        for (let l = this.surcharges.length, i = 0; i < l; i++) {
          if (this.surcharges[i].eveningStartTime) {
            this.surcharges[i].eveningStartTime = moment(this.surcharges[i].eveningStartTime, 'HH:mm');
          }
          if (this.surcharges[i].eveningEndTime) {
            this.surcharges[i].eveningEndTime = moment(this.surcharges[i].eveningEndTime, 'HH:mm');
          }
          if (this.surcharges[i].customStartTime) {
            this.surcharges[i].customStartTime = moment(this.surcharges[i].customStartTime, 'HH:mm');
          }
          if (this.surcharges[i].customEndTime) {
            this.surcharges[i].customEndTime = moment(this.surcharges[i].customEndTime, 'HH:mm');
          }
          this.surchargesOptions.push({ label: this.surcharges[i].name, value: this.surcharges[i]._id });
        }
      } catch (e) {
        NotifyNegative('Erreur lors du rafraîchissement des plans de majoration.');
        console.error(e);
        this.surcharges = [];
      } finally {
        this.surchargesLoading = false;
      }
    },
    async refreshServices () {
      try {
        this.servicesLoading = true;
        const services = await Services.list();
        this.services = services.map(service => ({
          ...this.getServiceLastVersion(service),
          ...service,
        })).sort((a, b) => {
          if (a.isArchived && !b.isArchived) return 1;
          if (!a.isArchived && b.isArchived) return -1;
          return 0;
        });
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du rafraîchissement des services.');
        this.services = [];
      } finally {
        this.servicesLoading = false;
      }
    },
    async refreshThirdPartyPayers () {
      try {
        this.tppsLoading = true;
        this.thirdPartyPayers = await ThirdPartyPayers.list();
      } catch (e) {
        this.thirdPartyPayers = [];
        console.error(e);
      } finally {
        this.tppsLoading = false;
      }
    },
    // Surcharges
    resetCreationSurchargeData () {
      this.newSurcharge = {
        name: '',
        saturday: '',
        sunday: '',
        publicHoliday: '',
        twentyFifthOfDecember: '',
        firstOfMay: '',
        firstOfJanuary: '',
        evening: '',
        eveningStartTime: null,
        eveningEndTime: null,
        custom: '',
        customStartTime: null,
        customEndTime: null,
      };
      this.$v.newSurcharge.$reset();
    },
    formatSurchargePayload (surcharge) {
      const payload = cloneDeep(surcharge);
      if (surcharge.eveningStartTime) {
        payload.eveningStartTime = moment(surcharge.eveningStartTime, 'HH:mm').format('HH:mm');
      }
      if (surcharge.eveningEndTime) {
        payload.eveningEndTime = moment(surcharge.eveningEndTime, 'HH:mm').format('HH:mm');
      }
      if (surcharge.customStartTime) {
        payload.customStartTime = moment(surcharge.customStartTime, 'HH:mm').format('HH:mm');
      }
      if (surcharge.customEndTime) {
        payload.customEndTime = moment(surcharge.customEndTime, 'HH:mm').format('HH:mm');
      }

      return omit(payload, ['_id', 'company']);
    },
    async createNewSurcharge () {
      try {
        this.$v.newSurcharge.$touch();
        if (this.$v.newSurcharge.$error) return NotifyWarning('Champ(s) invalide(s)');
        this.loading = true;

        const payload = this.formatSurchargePayload(this.newSurcharge);
        await Surcharges.create(payload);
        NotifyPositive('Plan de majoration créé.');
        this.surchargeCreationModal = false;
        await this.refreshSurcharges();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du plan de majoration.');
      } finally {
        this.loading = false;
      }
    },
    openSurchargeEditionModal (id) {
      const selectedSurcharge = this.surcharges.find(surcharge => surcharge._id === id);
      const { eveningStartTime, eveningEndTime, customStartTime, customEndTime } = selectedSurcharge;
      const pickedFields = [
        '_id',
        'name',
        'saturday',
        'sunday',
        'publicHoliday',
        'twentyFifthOfDecember',
        'firstOfMay',
        'firstOfJanuary',
        'evening',
        'custom',
      ];
      this.editedSurcharge = {
        ...pick(selectedSurcharge, pickedFields),
        eveningStartTime: eveningStartTime ? moment(eveningStartTime).format('HH:mm') : '',
        eveningEndTime: eveningEndTime ? moment(eveningEndTime).format('HH:mm') : '',
        customStartTime: customStartTime ? moment(customStartTime).format('HH:mm') : '',
        customEndTime: customEndTime ? moment(customEndTime).format('HH:mm') : '',
      };
      this.surchargeEditionModal = true;
    },
    resetEditionSurchargeData () {
      this.editedSurcharge = {
        name: '',
        saturday: '',
        sunday: '',
        publicHoliday: '',
        twentyFifthOfDecember: '',
        firstOfMay: '',
        firstOfJanuary: '',
        evening: '',
        eveningStartTime: null,
        eveningEndTime: null,
        custom: '',
        customStartTime: null,
        customEndTime: null,
      };
      this.$v.editedSurcharge.$reset();
    },
    async updateSurcharge () {
      try {
        this.$v.editedSurcharge.$touch();
        if (this.$v.editedSurcharge.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const payload = this.formatSurchargePayload(this.editedSurcharge);
        await Surcharges.updateById(this.editedSurcharge._id, payload);

        NotifyPositive('Plan de majoration modifié.');
        this.surchargeEditionModal = false;
        await this.refreshSurcharges();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du plan de majoration.');
      } finally {
        this.loading = false;
      }
    },
    async deleteSurcharge (surchargeId, row) {
      try {
        const index = this.getRowIndex(this.surcharges, row);
        await Surcharges.remove(surchargeId);
        this.surcharges.splice(index, 1);
        NotifyPositive('Plan de majoration supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du plan de majoration.');
      }
    },
    validateSurchargeDeletion (surchargeId, row) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Etes-vous sûr de vouloir supprimer ce plan de majoration ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => this.deleteSurcharge(surchargeId, row))
        .onCancel(() => NotifyPositive('Suppression annulée'));
    },
    // Services
    getServiceLastVersion (service) {
      if (!service.versions || service.versions.length === 0) return {};

      return service.versions.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
    },
    formatCreatedService () {
      const { nature, name, defaultUnitAmount, exemptFromCharges } = this.newService;
      const formattedService = {
        nature,
        versions: [{
          name,
          defaultUnitAmount,
          exemptFromCharges,
          // first version does not have actual start date
          startDate: moment('1970-01-01').startOf('d').toISOString(),
        }],
      };
      if (this.newService.surcharge && this.newService.surcharge !== '') {
        formattedService.versions[0].surcharge = this.newService.surcharge;
      }
      if (this.newService.vat && this.newService.vat !== '') formattedService.versions[0].vat = this.newService.vat;

      return formattedService;
    },
    resetCreationServiceData () {
      this.newService = {
        name: '',
        nature: '',
        defaultUnitAmount: '',
        vat: '',
        surcharge: null,
        exemptFromCharges: false,
      };
      this.$v.newService.$reset();
    },
    async createNewService () {
      try {
        this.$v.newService.$touch();
        if (this.$v.newService.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const payload = this.formatCreatedService();
        await Services.create(payload);

        NotifyPositive('Service créé.');
        this.serviceCreationModal = false;
        await this.refreshServices();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du service.');
      } finally {
        this.loading = false;
      }
    },
    openServiceEditionModal (id) {
      const selectedService = this.services.find(service => service._id === id);
      const { name, defaultUnitAmount, vat, surcharge, nature, exemptFromCharges } = selectedService;
      this.editedService = {
        _id: selectedService._id,
        name: name || '',
        startDate: '',
        defaultUnitAmount: defaultUnitAmount || '',
        vat: vat || '',
        nature,
        surcharge: surcharge ? surcharge._id : null,
        exemptFromCharges,
      };

      this.serviceEditionModal = true;
    },
    resetEditionServiceData () {
      this.editedService = {
        name: '',
        startDate: '',
        defaultUnitAmount: '',
        vat: '',
        nature: '',
        surcharge: null,
        exemptFromCharges: false,
      };
      this.$v.editedService.$reset();
    },
    formatEditedService () {
      const payload = pickBy(this.editedService);
      delete payload._id;
      delete payload.nature;

      return payload;
    },
    async updateService () {
      try {
        this.$v.editedService.$touch();
        if (this.$v.editedService.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const payload = this.formatEditedService();
        await Services.updateById(this.editedService._id, payload);

        NotifyPositive('Service modifié');
        this.serviceEditionModal = false;
        await this.refreshServices();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du service.');
      } finally {
        this.loading = false;
      }
    },
    async deleteService (serviceId, row) {
      try {
        const index = this.getRowIndex(this.services, row);
        await Services.remove(serviceId);
        this.services.splice(index, 1);
        NotifyPositive('Service supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du service.');
      }
    },
    validateServiceDeletion (serviceId, row) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Etes-vous sûr de vouloir supprimer ce service ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => this.deleteService(serviceId, row))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
    async archiveService (serviceId) {
      try {
        await Services.updateById(serviceId, { isArchived: true });
        NotifyPositive('Service archivé.');
        await this.refreshServices();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'archivage du service.');
      }
    },
    validateServiceArchiving (serviceId) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Etes-vous sûr de vouloir archiver ce service ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => this.archiveService(serviceId))
        .onCancel(() => NotifyPositive('Archivage annulé.'));
    },
    showHistory (id) {
      this.selectedService = this.services.find(ser => ser._id === id);
      this.serviceHistoryModal = true;
    },
    resetServiceHistoryData () {
      this.selectedService = {};
    },
    // Third party payers
    openThirdPartyPayerEditionModal (tppId) {
      this.thirdPartyPayerEditionModal = true;
      const currentThirdPartyPayer = this.thirdPartyPayers.find(tpp => tpp._id === tppId);
      this.editedThirdPartyPayer = {
        address: {},
        ...pick(
          currentThirdPartyPayer,
          ['_id', 'name', 'address', 'email', 'unitTTCRate', 'billingMode', 'isApa', 'teletransmissionId']
        ),
      };
    },
    resetThirdPartyPayerCreation () {
      this.$v.newThirdPartyPayer.$reset();
      this.newThirdPartyPayer = {
        name: '',
        email: '',
        address: {},
        unitTTCRate: 0,
        billingMode: '',
        isApa: false,
        teletransmissionId: '',
      };
    },
    formatThirdPartyPayerPayload (tpp) {
      const payload = cloneDeep(tpp);
      if (payload.address && !payload.address.fullAddress) delete payload.address;

      return { isApa: false, ...pickBy(payload) };
    },
    async createNewThirdPartyPayer () {
      try {
        const formIsValid = await this.waitForFormValidation(this.$v.newThirdPartyPayer);
        if (!formIsValid) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        await ThirdPartyPayers.create(this.formatThirdPartyPayerPayload(this.newThirdPartyPayer));
        await this.refreshThirdPartyPayers();
        NotifyPositive('Tiers payeur créé.');
        this.thirdPartyPayerCreationModal = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du tiers payeur.');
      } finally {
        this.loading = false;
      }
    },
    resetThirdPartyPayerEdition () {
      this.$v.editedThirdPartyPayer.$reset();
      this.editedThirdPartyPayer = { address: {} };
    },
    async updateThirdPartyPayer () {
      try {
        const formIsValid = await this.waitForFormValidation(this.$v.editedThirdPartyPayer);
        if (!formIsValid) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const thirdPartyPayerId = this.editedThirdPartyPayer._id;
        delete this.editedThirdPartyPayer._id;
        const payload = this.editedThirdPartyPayer;
        await ThirdPartyPayers.updateById(thirdPartyPayerId, this.formatThirdPartyPayerPayload(payload));
        await this.refreshThirdPartyPayers();
        NotifyPositive('Tiers payeur modifié.');
        this.thirdPartyPayerEditionModal = false;
      } catch (e) {
        NotifyNegative('Erreur lors de la modification du tiers payeur.');
        console.error(e);
      } finally {
        this.loading = false;
      }
    },
    async deleteThirdPartyPayer (thirdPartyPayerId, row) {
      try {
        const index = this.getRowIndex(this.thirdPartyPayers, row);
        await ThirdPartyPayers.removeById(thirdPartyPayerId);
        this.thirdPartyPayers.splice(index, 1);
        NotifyPositive('Tiers payeur supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du tiers payeur.');
      }
    },
    validateTppDeletion (thirdPartyPayerId, row) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Etes-vous sûr de vouloir supprimer ce tiers payeur ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => this.deleteThirdPartyPayer(thirdPartyPayerId, row))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
    isTppUsedInFundings (tpp) {
      const index = this.getRowIndex(this.thirdPartyPayers, tpp);
      return this.thirdPartyPayers[index].isUsedInFundings;
    },
  },
};
</script>

<style lang="stylus" scoped>
  .archived
    display: flex;
    align-self: center;
</style>
