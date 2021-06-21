<template>
  <div>
    <div class="row">
      <ni-contracts-cell v-if="contracts" :contracts="contracts" :user="auxiliary" :columns="contractsVisibleColumns"
        :person-key="COACH" display-actions display-uploader @open-end-contract="openEndContractModal"
        @open-version-edition="openVersionEditionModal" @open-version-creation="openVersionCreationModal"
        @refresh="refreshContracts" @refreshW-wth-timeout="refreshContractsWithTimeout"
        @delete-version="validateVersionDeletion" :contracts-loading="contractsLoading" />
      <q-btn :disable="missingInfoForCreation || contractsLoading || inProgressContract" class="fixed fab-custom"
        no-caps rounded color="primary" icon="add" label="Créer un nouveau contrat" @click="openCreationModal" />
      <ni-banner v-if="missingInfoForCreation">
        <template #message>{{ creationMissingInfo }}</template>
      </ni-banner>
    </div>

    <contract-creation-modal v-model="newContractModal" @hide="resetContractCreationModal" @submit="createContract"
      :new-contract.sync="newContract" :weekly-hours-error="weeklyHoursError($v.newContract)" :loading="loading"
      :gross-hourly-rate-error="grossHourlyRateError($v.newContract)" :validations="$v.newContract"
      :contract-min-start-date="contractMinStartDate" />

    <version-creation-modal v-model="newVersionModal" :gross-hourly-rate-error="grossHourlyRateError($v.newVersion)"
      :new-version-min-start-date="newVersionMinStartDate" :new-version.sync="newVersion" :validations="$v.newVersion"
      :weekly-hours-error="weeklyHoursError($v.newVersion)" @hide="resetVersionCreationModal" @submit="createVersion"
      :loading="loading" :start-date-error="startDateError($v.newVersion)" />

    <version-edition-modal v-model="versionEditionModal" :edited-version.sync="editedVersion" :loading="loading"
      :validations="$v.editedVersion" :min-start-date="editedVersionMinStartDate" :is-version-updated="isVersionUpdated"
      @hide="resetVersionEditionModal" @submit="editVersion" :start-date-error="startDateError($v.editedVersion)"
      :gross-hourly-rate-error="grossHourlyRateError($v.editedVersion)" />

    <contract-ending-modal v-model="endContractModal" :contract-to-end.sync="contractToEnd"
      :validations="$v.contractToEnd" @hide="resetEndContractModal" @submit="endExistingContract"
      :contract-min-end-date="contractMinEndDate" :end-contract-reasons="endContractReasons" :loading="loading" />
  </div>
</template>

<script>
import get from 'lodash/get';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import omit from 'lodash/omit';
import { required, requiredIf, minValue } from 'vuelidate/lib/validators';
import Users from '@api/Users';
import Events from '@api/Events';
import Contracts from '@api/Contracts';
import Banner from '@components/Banner';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import { minDate } from '@helpers/vuelidateCustomVal';
import moment from '@helpers/moment';
import ContractsCell from 'src/modules/client/components/contracts/ContractsCell';
import VersionEditionModal from 'src/modules/client/components/contracts/VersionEditionModal';
import VersionCreationModal from 'src/modules/client/components/contracts/VersionCreationModal';
import ContractCreationModal from 'src/modules/client/components/contracts/ContractCreationModal';
import ContractEndingModal from 'src/modules/client/components/contracts/ContractEndingModal';
import {
  END_CONTRACT_REASONS,
  OTHER,
  COACH,
  CONTRACT_CREATION_MANDATORY_INFO,
} from '@data/constants';
import { contractMixin } from 'src/modules/client/mixins/contractMixin';

export default {
  name: 'ProfileContracts',
  mixins: [contractMixin],
  props: {
    profileId: { type: String, required: true },
  },
  components: {
    'ni-contracts-cell': ContractsCell,
    'version-edition-modal': VersionEditionModal,
    'version-creation-modal': VersionCreationModal,
    'contract-creation-modal': ContractCreationModal,
    'contract-ending-modal': ContractEndingModal,
    'ni-banner': Banner,
  },
  data () {
    return {
      OTHER,
      COACH,
      contracts: [],
      auxiliary: {
        contractCreationMissingInfo: [],
      },
      contractsVisibleColumns: [
        'weeklyHours',
        'startDate',
        'endDate',
        'grossHourlyRate',
        'contractEmpty',
        'contractSigned',
        'archives',
        'actions',
      ],
      // New contract
      newContractModal: false,
      newContract: {
        weeklyHours: '',
        startDate: '',
        grossHourlyRate: '',
        shouldBeSigned: true,
      },
      // New version
      newVersionModal: false,
      newVersion: {
        weeklyHours: '',
        startDate: '',
        grossHourlyRate: '',
        shouldBeSigned: true,
      },
      // End contract
      endContractModal: false,
      contractToEnd: {
        endDate: '',
        endNotificationDate: '',
        endReason: '',
        otherMisc: '',
        contract: {},
      },
      endContractReasons: END_CONTRACT_REASONS,
      contractsLoading: false,
    };
  },
  validations () {
    return {
      newContract: {
        weeklyHours: { required, minValue: minValue(0) },
        startDate: { required },
        grossHourlyRate: { required, minValue: minValue(0) },
      },
      newVersion: {
        weeklyHours: { required, minValue: minValue(0) },
        startDate: { required, minDate: this.newVersionMinStartDate ? minDate(this.newVersionMinStartDate) : '' },
        grossHourlyRate: { required, minValue: minValue(0) },
      },
      editedVersion: {
        grossHourlyRate: { required, minValue: minValue(0) },
        startDate: { required, minDate: this.editedVersionMinStartDate ? minDate(this.editedVersionMinStartDate) : '' },
      },
      contractToEnd: {
        endNotificationDate: { required },
        endDate: { required },
        endReason: { required },
        otherMisc: { required: requiredIf(item => item.endReason === OTHER) },
      },
    };
  },
  computed: {
    inProgressContract () {
      return this.contracts.some(c => !c.endDate);
    },
    missingInfoForCreation () {
      return this.auxiliary.contractCreationMissingInfo.length !== 0;
    },
    creationMissingInfo () {
      const userMissingInfo = this.auxiliary.contractCreationMissingInfo;
      if (userMissingInfo.length === 1) {
        const missingInfo = CONTRACT_CREATION_MANDATORY_INFO[userMissingInfo[0]];
        return 'Il manque l\'information suivante dans la fiche de l\'auxiliaire pour créer un nouveau contrat :'
          + `${missingInfo}.`;
      }

      const missingInfoList = userMissingInfo.reduce(
        (acc, info) => [...acc, CONTRACT_CREATION_MANDATORY_INFO[info]],
        []
      );

      return 'Il manque les informations suivantes dans la fiche de l\'auxiliaire pour créer un nouveau contrat : '
        + `${missingInfoList.join(', ')}.`;
    },
    contractMinStartDate () {
      if (this.contracts.length === 0) return '';
      const endedContracts = this.contracts.filter(contract => contract.endDate)
        .sort((a, b) => b.startDate - a.startDate);

      if (endedContracts.length === 0) return '';

      return moment(endedContracts[0].endDate).add(1, 'd').toISOString();
    },
    contractMinEndDate () {
      if (this.endContractModal) {
        const lastVersion = this.contractToEnd.contract.versions[this.contractToEnd.contract.versions.length - 1];
        return moment(lastVersion.startDate).add(1, 'day').toISOString();
      }
      return '';
    },
  },
  async mounted () {
    try {
      this.contractsLoading = true;
      await Promise.all([this.refreshUser(), this.refreshContracts()]);
    } catch (e) {
      console.error(e);
    } finally {
      this.contractsLoading = false;
    }
  },
  methods: {
    async refreshUser () {
      try {
        this.auxiliary = await Users.getById(this.profileId);
      } catch (e) {
        this.auxiliary = null;
        console.error(e);
        NotifyNegative('Erreur lors de la récupération de l\'auxiliaire.');
      }
    },
    async refreshContracts () {
      try {
        this.contractsLoading = true;
        this.contracts = await Contracts.list({ user: this.profileId });
        const promises = [];
        for (const contract of this.contracts) {
          const version = contract.versions[contract.versions.length - 1];
          promises.push(Events.list({ auxiliary: contract.user._id, startDate: version.startDate }));
        }

        const events = await Promise.all(promises);
        for (let i = 0, l = events.length; i < l; i++) {
          this.contracts[i].versions = this.contracts[i].versions.map((version, index) => {
            const isLastVersion = index === this.contracts[i].versions.length - 1;
            if (!isLastVersion) return { ...version, canBeDeleted: false };

            return { ...version, canBeDeleted: index !== 0 || events[i].length === 0 };
          });
        }
      } catch (e) {
        this.contracts = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des contracts.');
      } finally {
        this.contractsLoading = false;
      }
    },
    // Contract creation
    openCreationModal () {
      this.newContract.user = this.auxiliary._id;
      this.newContract.grossHourlyRate = get(this.auxiliary, 'company.rhConfig.grossHourlyRate');
      this.newContractModal = true;
    },
    resetContractCreationModal () {
      this.newContractModal = false;
      this.newContract = {
        weeklyHours: '',
        startDate: '',
        grossHourlyRate: '',
        shouldBeSigned: true,
      };
      this.$v.newContract.$reset();
    },
    async getContractCreationPayload () {
      const payload = {
        startDate: this.newContract.startDate,
        user: this.newContract.user,
        versions: [{
          startDate: this.newContract.startDate,
          grossHourlyRate: this.newContract.grossHourlyRate,
          weeklyHours: this.newContract.weeklyHours,
        }],
      };

      if (this.newContract.shouldBeSigned) {
        const template = this.getContractTemplate();
        payload.versions[0].signature = await this.getSignaturePayload(this.newContract, '', template);
      }

      return pickBy(payload);
    },
    async createContract () {
      try {
        const template = this.getContractTemplate();
        if (!template || !template.driveId) return NotifyWarning('Template manquant');

        this.$v.newContract.$touch();
        if (this.$v.newContract.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const payload = await this.getContractCreationPayload();
        await Contracts.create(payload);
        await this.refreshContracts();

        this.resetContractCreationModal();
        NotifyPositive('Contrat créé');
      } catch (e) {
        console.error(e);
        if (e.status === 422) {
          this.$v.newContract.$reset();
          return NotifyNegative(`Impossible de créer ce contrat : il est en conflit avec les évènements ou autres
            contrats de l'auxiliaire.`);
        }
        NotifyNegative('Erreur lors de la création du contrat.');
      } finally {
        this.loading = false;
      }
    },
    // Version creation
    openVersionCreationModal (contract) {
      this.newVersion.grossHourlyRate = get(this.auxiliary, 'company.rhConfig.grossHourlyRate');
      this.newVersion.contractId = contract._id;
      this.selectedContract = contract;
      this.newVersionModal = true;
    },
    resetVersionCreationModal () {
      this.newVersionModal = false;
      this.newVersion = { weeklyHours: '', startDate: '', grossHourlyRate: '', shouldBeSigned: true };
      this.$v.newVersion.$reset();
    },
    async getVersionCreationPayload () {
      const payload = pick(this.newVersion, ['startDate', 'grossHourlyRate', 'weeklyHours']);
      if (this.newVersion.shouldBeSigned) {
        const versionMix = { ...this.selectedContract, ...this.newVersion };
        const template = this.getVersionTemplate();
        payload.signature = await this.getSignaturePayload(versionMix, 'Avenant au ', template);
      }

      return pickBy(payload);
    },
    async createVersion () {
      try {
        const template = this.getVersionTemplate();
        if (!template || !template.driveId) return NotifyWarning('Template manquant');

        this.$v.newVersion.$touch();
        if (this.$v.newVersion.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const payload = await this.getVersionCreationPayload();
        await Contracts.createVersion(this.newVersion.contractId, payload);
        await this.refreshContracts();

        this.resetVersionCreationModal();
        NotifyPositive('Version créée');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de l\'avenant.');
      } finally {
        this.loading = false;
      }
    },
    // Contract edition
    openVersionEditionModal ({ contract, version }) {
      this.editedVersion = {
        contractId: contract._id,
        versionId: version._id,
        grossHourlyRate: version.grossHourlyRate,
        startDate: version.startDate,
        shouldBeSigned: !!version.signature && !!version.signature.eversignId,
      };
      this.selectedContract = contract;
      this.selectedVersion = version;
      this.versionEditionModal = true;
    },
    // Delete version
    validateVersionDeletion ({ contractId, versionId }) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Etes-vous sûr de vouloir supprimer cet avenant ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => this.deleteVersion(contractId, versionId))
        .onCancel(() => NotifyPositive('Suppression annulée'));
    },
    async deleteVersion (contractId, versionId) {
      try {
        await Contracts.deleteVersion(contractId, versionId);
        await this.refreshContracts();
        NotifyPositive('Version supprimée');
      } catch (e) {
        console.error(e);
        if (e.status === 403) return NotifyNegative('Impossible de supprimer cet avenant.');
        NotifyNegative('Erreur lors de la suppression de l\'avenant.');
      }
    },
    // End contract
    async openEndContractModal (contract) {
      this.contractToEnd.contract = contract;
      this.endContractModal = true;
    },
    resetEndContractModal () {
      this.endContractModal = false;
      this.contractToEnd = {};
      this.$v.contractToEnd.$reset();
    },
    formatEndContractPayload () {
      const omittedField = ['contract', 'endDate'];
      if (this.contractToEnd.endReason !== OTHER) omittedField.push('otherMisc');

      return {
        ...omit(this.contractToEnd, omittedField),
        endDate: moment(this.contractToEnd.endDate).endOf('day').toISOString(),
      };
    },
    async endExistingContract () {
      try {
        this.$v.contractToEnd.$touch();
        if (this.$v.contractToEnd.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        await Contracts.update(this.contractToEnd.contract._id, this.formatEndContractPayload());
        await this.refreshContracts();
        this.resetEndContractModal();
        NotifyPositive('Contrat terminé');
      } catch (e) {
        console.error(e);
        if (e.status === 403 || e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la mise à jour du contrat.');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
