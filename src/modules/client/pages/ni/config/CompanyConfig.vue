<template>
  <q-page class="client-background" padding>
    <div v-if="company">
      <ni-title-header title="Configuration générale" class="q-mb-xl" />
      <div class="q-mb-xl">
        <p class="text-weight-bold">Informations de l'organisation</p>
        <div class="row gutter-profile">
          <ni-input caption="Raison sociale" v-model="company.name" @focus="saveTmp('name')"
            @blur="updateCompany('name')" :error="$v.company.name.$error" />
          <ni-input caption="Nom commercial" v-model.trim="company.tradeName" @focus="saveTmp('tradeName')"
            @blur="updateCompany('tradeName')" :error="$v.company.tradeName.$error"
            :error-message="tradeNameError($v.company)" />
          <ni-search-address v-model="company.address" :error-message="addressError" @blur="updateCompany('address')"
            @focus="saveTmp('address.fullAddress')" :error="$v.company.address.$error" />
          <ni-input v-if="company.type === COMPANY" caption="Numéro RCS" v-model="company.rcs" @focus="saveTmp('rcs')"
            @blur="updateCompany('rcs')" :error="$v.company.rcs.$error" :error-message="rcsError" />
          <ni-input v-else caption="Numéro RNA" v-model="company.rna" @focus="saveTmp('rna')"
            @blur="updateCompany('rna')" :error="$v.company.rna.$error" :error-message="rcsError" />
        </div>
      </div>
      <div class="q-mb-xl" v-if="canUpdateErpConfig">
        <p class="text-weight-bold">Représentant légal</p>
        <div class="row gutter-profile">
          <ni-input caption="Prénom" :error="$v.company.legalRepresentative.firstname.$error"
            v-model="company.legalRepresentative.firstname" @focus="saveTmp('legalRepresentative.firstname')"
            error-message="Prénom invalide" @blur="updateCompany('legalRepresentative.firstname')" />
          <ni-input caption="Nom" :error="$v.company.legalRepresentative.lastname.$error" error-message="Nom invalide"
            v-model="company.legalRepresentative.lastname" @focus="saveTmp('legalRepresentative.lastname')"
            @blur="updateCompany('legalRepresentative.lastname')" />
          <ni-input caption="Fonction" :error="$v.company.legalRepresentative.position.$error"
            v-model="company.legalRepresentative.position" @focus="saveTmp('legalRepresentative.position')"
            error-message="Fonction invalide" @blur="updateCompany('legalRepresentative.position')" />
        </div>
      </div>
      <div class="q-mb-xl" v-if="canUpdateErpConfig">
        <p class="text-weight-bold">Facturation</p>
        <div class="row gutter-profile">
          <ni-input caption="IBAN" :error="$v.company.iban.$error" :error-message="ibanError"
            v-model.trim="company.iban" @focus="saveTmp('iban')" upper-case @blur="updateCompany('iban')" />
          <ni-input caption="BIC" :error="$v.company.bic.$error" :error-message="bicError" upper-case
            v-model.trim="company.bic" @focus="saveTmp('bic')" @blur="updateCompany('bic')" />
          <ni-input caption="Numéro ICS" v-model="company.ics" @focus="saveTmp('ics')" @blur="updateCompany('ics')"
            :error="$v.company.ics.$error" />
          <ni-input caption="Support facturation" :error="$v.company.billingAssistance.$error"
            :error-message="billingAssistanceError" v-model.trim="company.billingAssistance"
            @focus="saveTmp('billingAssistance')" @blur="updateCompany('billingAssistance')" />
        </div>
      </div>
      <div class="q-mb-xl" v-if="canUpdateErpConfig">
        <p class="text-weight-bold">Paie</p>
        <div class="row gutter-profile">
          <ni-input caption="Code APE/NAF" :error="$v.company.apeCode.$error" error-message="Code APE/NAF invalide"
            v-model="company.apeCode" mask="XXXXX" @focus="saveTmp('apeCode')" @blur="updateCompany('apeCode')" />
        </div>
      </div>
      <div class="q-mb-xl" v-if="canUpdateErpConfig">
        <p class="text-weight-bold">Établissements</p>
        <q-card>
          <ni-responsive-table :data="establishments" :columns="establishmentsColumns" :loading="establishmentsLoading"
            :pagination.sync="establishmentsPagination">
            <template #body="{ props }">
              <q-tr :props="props">
                <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                  :style="col.style">
                  <template v-if="col.name === 'actions'">
                    <div class="row no-wrap table-actions">
                      <ni-button icon="edit" @click="openEstablishmentEditionModal(col.value)" />
                      <ni-button icon="delete" :disable="props.row.usersCount > 0"
                        @click="validateEstablishmentDeletion(col.value)" />
                    </div>
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
              </q-tr>
            </template>
          </ni-responsive-table>
          <q-card-actions align="right">
            <ni-button icon="add" label="Ajouter un établissement" :disable="establishmentsLoading"
              @click="establishmentCreationModal = true" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Establishment creation modal -->
    <establishment-creation-modal v-model="establishmentCreationModal" :new-establishment.sync="newEstablishment"
      :validations="$v.newEstablishment" @hide="resetEstablishmentCreationModal" @submit="createNewEstablishment"
      :loading="loading" :work-health-services="workHealthServices" :urssaf-codes="urssafCodes" />

    <!-- Establishment edition modal -->
    <establishment-edition-modal v-model="establishmentEditionModal" :edited-establishment.sync="editedEstablishment"
      :validations="$v.editedEstablishment" @hide="resetEstablishmentEditionModal" @submit="updateEstablishment"
      :loading="loading" :work-health-services="workHealthServices" :urssaf-codes="urssafCodes" />
  </q-page>
</template>

<script>
import { mapGetters } from 'vuex';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import { required, maxLength } from 'vuelidate/lib/validators';
import Establishments from '@api/Establishments';
import TitleHeader from '@components/TitleHeader';
import Button from '@components/Button';
import Input from '@components/form/Input';
import ResponsiveTable from '@components/table/ResponsiveTable';
import SearchAddress from '@components/form/SearchAddress';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { COMPANY } from '@data/constants';
import { urssafCodes } from '@data/urssafCodes';
import { workHealthServices } from '@data/workHealthServices';
import {
  frAddress,
  validWorkHealthService,
  validUrssafCode,
  validSiret,
  frPhoneNumber,
} from '@helpers/vuelidateCustomVal';
import { formatPhoneForPayload } from '@helpers/utils';
import { defineAbilitiesFor } from '@helpers/ability';
import { companyMixin } from '@mixins/companyMixin';
import { validationMixin } from '@mixins/validationMixin';
import EstablishmentCreationModal from 'src/modules/client/components/config/EstablishmentCreationModal';
import EstablishmentEditionModal from 'src/modules/client/components/config/EstablishmentEditionModal';
import { configMixin } from 'src/modules/client/mixins/configMixin';
import { tableMixin } from 'src/modules/client/mixins/tableMixin';

export default {
  name: 'CompanyConfig',
  metaInfo: { title: 'Configuration générale' },
  components: {
    'ni-input': Input,
    'ni-title-header': TitleHeader,
    'ni-button': Button,
    'ni-search-address': SearchAddress,
    'ni-responsive-table': ResponsiveTable,
    'establishment-creation-modal': EstablishmentCreationModal,
    'establishment-edition-modal': EstablishmentEditionModal,
  },
  mixins: [configMixin, validationMixin, tableMixin, companyMixin],
  data () {
    return {
      documents: null,
      COMPANY,
      loading: false,
      establishmentsLoading: false,
      // Establishment
      establishments: [],
      establishmentsColumns: [
        { name: 'name', label: 'Nom', align: 'left', field: 'name' },
        { name: 'siret', label: 'SIRET', align: 'left', field: 'siret' },
        { name: 'address', label: 'Adresse', align: 'left', field: row => get(row, 'address.fullAddress') || '' },
        { name: 'phone', label: 'Téléphone', align: 'left', field: 'phone' },
        {
          name: 'workHealthService',
          label: 'Service de santé du travail',
          align: 'left',
          field: 'workHealthService',
          format: value => (value ? get(workHealthServices.find(whs => whs.value === value), 'label', '') : ''),
        },
        {
          name: 'urssafCode',
          label: 'Code URSSAF',
          align: 'left',
          field: 'urssafCode',
          format: value => (value ? get(urssafCodes.find(code => code.value === value), 'label', '') : ''),
        },
        { name: 'actions', label: '', align: 'center', field: '_id' },
      ],
      establishmentsPagination: { rowsPerPage: 0, sortBy: 'name' },
      establishmentCreationModal: false,
      newEstablishment: {
        name: '',
        siret: '',
        address: { fullAddress: '' },
        phone: '',
        workHealthService: '',
        urssafCode: '',
      },
      editedEstablishment: {
        name: '',
        siret: '',
        address: { fullAddress: '' },
        phone: '',
        workHealthService: '',
        urssafCode: '',
      },
      establishmentEditionModal: false,
      workHealthServices,
      urssafCodes,
      establishmentValidation: {
        name: { required, maxLength: maxLength(32) },
        siret: { required, validSiret },
        address: { fullAddress: { required, frAddress } },
        phone: { required, frPhoneNumber },
        workHealthService: { required, validWorkHealthService },
        urssafCode: { required, validUrssafCode },
      },
    };
  },
  validations () {
    return {
      company: this.companyValidation,
      newEstablishment: this.establishmentValidation,
      editedEstablishment: this.establishmentValidation,
    };
  },
  computed: {
    ...mapGetters({ clientRole: 'main/getClientRole' }),
    canUpdateErpConfig () {
      const ability = defineAbilitiesFor(pick(this.loggedUser, ['role', 'company']));

      return ability.can('update', 'erp_config');
    },
  },
  async mounted () {
    if (this.canUpdateErpConfig) await Promise.all([this.refreshCompany(), this.getEstablishments()]);
    else await this.refreshCompany();
  },
  methods: {
    // Establishment
    async getEstablishments () {
      try {
        this.establishmentsLoading = true;
        this.establishments = await Establishments.list();
      } catch (e) {
        console.error(e);
        this.establishments = [];
        NotifyNegative('Erreur lors de la récupération des établissements.');
      } finally {
        this.establishmentsLoading = false;
      }
    },
    resetEstablishmentCreationModal () {
      this.newEstablishment = {
        name: '',
        siret: '',
        address: {},
        phone: '',
        workHealthService: '',
        urssafCode: '',
      };
      this.$v.newEstablishment.$reset();
    },
    async createNewEstablishment () {
      try {
        const formIsValid = await this.waitForFormValidation(this.$v.newEstablishment);
        if (!formIsValid) {
          return NotifyWarning('Champ(s) invalide(s)');
        }

        this.loading = true;
        if (this.newEstablishment.phone) {
          this.newEstablishment.phone = formatPhoneForPayload(this.newEstablishment.phone);
        }

        await Establishments.create(this.newEstablishment);
        NotifyPositive('Établissement créé.');
        this.resetEstablishmentCreationModal();
        this.establishmentCreationModal = false;
        await this.getEstablishments();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        return NotifyNegative('Erreur lors de la création de l\'établissement.');
      } finally {
        this.loading = false;
      }
    },
    openEstablishmentEditionModal (establishmentId) {
      this.editedEstablishment = cloneDeep(this.establishments.find(est => est._id === establishmentId)) ||
        this.editedEstablishment;
      this.establishmentEditionModal = true;
    },
    resetEstablishmentEditionModal () {
      this.editedEstablishment = {
        name: '',
        siret: '',
        address: {},
        phone: '',
        workHealthService: '',
        urssafCode: '',
      };
      this.$v.editedEstablishment.$reset();
    },
    async updateEstablishment () {
      try {
        const formIsValid = await this.waitForFormValidation(this.$v.editedEstablishment);
        if (!formIsValid) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const fields = ['name', 'siret', 'address', 'phone', 'workHealthServices', 'urssafCodes'];
        if (this.editedEstablishment.phone) {
          this.editedEstablishment.phone = formatPhoneForPayload(this.editedEstablishment.phone);
        }

        await Establishments.update(this.editedEstablishment._id, pick(this.editedEstablishment, fields));

        NotifyPositive('Établissement modifié.');
        this.establishmentEditionModal = false;
        await this.getEstablishments();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        return NotifyNegative('Erreur lors de la modification de l\'établissement');
      } finally {
        this.loading = false;
      }
    },
    async deleteEstablishment (establishmentId) {
      try {
        await Establishments.remove(establishmentId);
        await this.getEstablishments();
        NotifyPositive('Établissement supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de l\'établissement.');
      }
    },
    validateEstablishmentDeletion (sectorId) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Etes-vous sûr de vouloir supprimer cet établissement ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => this.deleteEstablishment(sectorId))
        .onCancel(() => NotifyPositive('Suppression annulée'));
    },
  },
};
</script>
