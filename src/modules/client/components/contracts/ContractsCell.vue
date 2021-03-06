<template>
  <div class="cell-container">
    <q-card v-for="(contract, contractIndex) in sortedContracts" :key="contractIndex" class="contract-cell">
      <q-card-section class="cell-title" :style="{ color: cellTitle(contract.endDate).color }">
        <div>{{ cellTitle(contract.endDate).msg }}</div>
        <ni-button v-if="displayActions" label="DPAE" icon="file_download" color="primary"
          @click="exportDpae(contract._id)" />
      </q-card-section>
      <ni-responsive-table :data="contract.versions" :columns="contractsColumns" row-key="name"
        :loading="contractsLoading" :pagination.sync="pagination" :visible-columns="visibleColumns(contract)">
        <template #body="{ props }">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
              :style="col.style">
              <template v-if="col.name === 'contractEmpty'">
                <div class="row justify-center table-actions">
                  <ni-button @click="dlTemplate(props.row, contract, contractIndex)" icon="file_download"
                    :disable="!canDownload(props.row, contractIndex)" />
                </div>
              </template>
              <template v-if="col.name === 'contractSigned'">
                <div v-if="hasToBeSignedOnline(props.row) && shouldSignContract(props.row.signature)">
                  <ni-button :flat="false" v-if="!props.row.endDate" label="Signer"
                  @click="openSignatureModal(props.row.signature.eversignId)" />
                </div>
                <div v-else-if="!getContractLink(props.row) && displayUploader && !hasToBeSignedOnline(props.row)"
                  class="row justify-center table-actions">
                  <q-uploader flat :url="docsUploadUrl(contract._id)" with-credentials auto-upload @uploaded="refresh"
                    :form-fields="getFormFields(contract, props.row)" field-name="file" :accept="extensions"
                    @fail="failMsg" />
                </div>
                <div v-else-if="getContractLink(props.row)" class="row justify-center table-actions">
                  <ni-button type="a" :href="getContractLink(props.row)" target="_blank" icon="file_download" />
                </div>
                <div v-else-if="hasToBeSignedOnline(props.row)" class="row justify-center table-actions">
                  <p class="no-margin">En attente de signature</p>
                </div>
              </template>
              <template v-else-if="col.name === 'archives'">
                <div class="row archives justify-center">
                  <div v-for="archive in col.value" :key="archive._id">
                    <ni-button type="a" :href="getArchiveLink(archive)" target="_blank" icon="file_download"
                      :disable="!getArchiveLink(archive)" />
                  </div>
                </div>
              </template>
              <template v-else-if="col.name === 'actions'">
                <div v-if="!contract.endDate && !props.row.endDate" class="row no-wrap table-actions contract-actions">
                  <ni-button icon="edit" @click="openVersionEdition(contract, props.row)" />
                  <ni-button icon="delete" :disable="!props.row.canBeDeleted"
                    @click="deleteVersion(contract._id, props.row._id)" />
                </div>
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>
        </template>
      </ni-responsive-table>
      <q-card-actions align="right">
        <template v-if="displayActions && !contract.endDate">
          <ni-button icon="add" label="Ajouter un avenant"
            @click="openVersionCreation(contract)" :disable="contractsLoading" />
          <ni-button icon="clear" label="Mettre fin au contrat"
            @click="openEndContract(contract)" :disable="contractsLoading" />
        </template>
      </q-card-actions>
    </q-card>

    <q-dialog v-model="esignModal" @hide="refreshWithTimeout" full-height full-width>
      <q-card class="full-height" style="width: 80vw">
        <q-card-section class="row justify-end">
          <ni-button icon="clear" size="sm" @click.native="esignModal = false" />
        </q-card-section>
        <q-card-section class="full-height">
          <iframe :src="embeddedUrl" frameborder="0" class="iframe-normal" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import orderBy from 'lodash/orderBy';
import get from 'lodash/get';
import esign from '@api/Esign';
import Contracts from '@api/Contracts';
import Button from '@components/Button';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import ResponsiveTable from '@components/table/ResponsiveTable';
import { COACH, CUSTOMER, AUXILIARY, DOC_EXTENSIONS } from '@data/constants';
import { downloadDriveDocx, downloadFile } from '@helpers/file';
import { formatIdentity } from '@helpers/utils';
import { formatDate } from '@helpers/date';
import moment from '@helpers/moment';
import { generateContractFields } from 'src/modules/client/helpers/generateContractFields';
import { tableMixin } from 'src/modules/client/mixins/tableMixin';

export default {
  name: 'ContractsCell',
  mixins: [tableMixin],
  components: {
    'ni-button': Button,
    'ni-responsive-table': ResponsiveTable,
  },
  props: {
    user: { type: Object, default: () => null },
    contracts: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    displayActions: { type: Boolean, default: () => false },
    displayUploader: { type: Boolean, default: () => false },
    personKey: { type: String, default: () => COACH },
    contractsLoading: { type: Boolean, default: false },
  },
  data () {
    return {
      CUSTOMER,
      esignModal: false,
      embeddedUrl: '',
      pagination: { rowsPerPage: 0 },
      contractsColumns: [
        { name: 'weeklyHours', label: 'Volume horaire hebdomadaire', align: 'center', field: 'weeklyHours' },
        { name: 'startDate', label: 'Date d\'effet', align: 'left', field: 'startDate', format: formatDate },
        { name: 'endDate', label: 'Date de fin', align: 'left', field: 'endDate', format: d => formatDate(d) || '∞' },
        { name: 'grossHourlyRate', label: 'Taux horaire', align: 'center', field: 'grossHourlyRate' },
        { name: 'contractEmpty', label: 'Word', align: 'center', field: 'contractEmpty' },
        {
          name: 'contractSigned',
          label: 'Contrat / Avenant',
          align: 'center',
          field: val => get(val, 'signature.eversignId') || '',
        },
        { name: 'archives', label: 'Archives', align: 'center', field: 'auxiliaryArchives' },
        { name: 'actions', align: 'center', field: '_id' },
      ],
      extensions: DOC_EXTENSIONS,
    };
  },
  computed: {
    sortedContracts () {
      const { contracts } = this;
      return contracts.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    },
  },
  methods: {
    cellTitle (contractEndDate) {
      if (!contractEndDate) return { msg: 'Contrat en cours', color: 'green' };

      if (moment().isBefore(contractEndDate)) {
        return {
          msg: `Le contrat se termine le ${moment(contractEndDate).format('DD MMMM YYYY')}`,
          color: 'orange',
        };
      }
      return {
        msg: `Contrat terminé le: ${moment(contractEndDate).format('DD MMMM YYYY')}`,
        color: 'red',
      };
    },
    failMsg () {
      NotifyNegative('Echec de l\'envoi du document.');
    },
    getFormFields (contract, version) {
      return [
        { name: 'fileName', value: `contrat_signe_${this.user.identity.firstname}_${this.user.identity.lastname}` },
        { name: 'contractId', value: contract._id },
        { name: 'versionId', value: version._id },
        { name: 'type', value: 'signedContract' },
      ];
    },
    getLastVersion (contract) {
      return orderBy(contract.versions, ['startDate'], ['desc'])[0];
    },
    visibleColumns (contract) {
      return this.columns;
    },
    openVersionCreation (contract) {
      this.$emit('open-version-creation', contract);
    },
    openVersionEdition (contract, version) {
      this.$emit('open-version-edition', { contract, version });
    },
    deleteVersion (contractId, versionId) {
      this.$emit('delete-version', { contractId, versionId });
    },
    openEndContract (contract) {
      this.$emit('open-end-contract', contract);
    },
    refresh () {
      this.$emit('refresh');
    },
    refreshWithTimeout () {
      this.$emit('refresh-with-timeout');
    },
    getArchiveLink (archive) {
      return archive.link || false;
    },
    // Documents
    canDownload (version, contractIndex) {
      const templates = get(this.user, 'company.rhConfig.templates');
      if (!templates) return false;

      const versionIndex = this.getRowIndex(this.sortedContracts[contractIndex].versions, version);
      if (versionIndex === 0) return !!templates.contract && !!templates.contract.driveId;

      return !!templates.contractVersion && !!templates.contractVersion.driveId;
    },
    docsUploadUrl (contractId) {
      const driveId = get(this.user, 'administrative.driveFolder.driveId');
      if (!driveId) return '';

      return `${process.env.API_HOSTNAME}/contracts/${contractId}/gdrive/${driveId}/upload`;
    },
    async exportDpae (contractId) {
      try {
        const txt = await Contracts.exportDpae(contractId);
        await downloadFile(txt, 'dpae.txt');

        NotifyPositive('Document téléchargé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement du document.');
      }
    },
    async dlTemplate (contractVersion, parentContract, contractIndex) {
      try {
        const data = generateContractFields({
          user: this.user,
          contract: contractVersion,
          initialContractStartDate: parentContract.startDate,
        });
        if (!this.canDownload(contractVersion, contractIndex)) {
          return NotifyNegative('Impossible de télécharger le contrat.');
        }

        const versionIndex = this.getRowIndex(this.sortedContracts[contractIndex].versions, contractVersion);
        const params = {
          driveId: versionIndex === 0
            ? this.user.company.rhConfig.templates.contract.driveId
            : this.user.company.rhConfig.templates.contractVersion.driveId,
        };

        await downloadDriveDocx(params, data, 'contrat.docx');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement du document.');
      }
    },
    async openSignatureModal (eversignId) {
      try {
        this.$q.loading.show();
        const document = await esign.getDocument(eversignId);
        const id = this.personKey === AUXILIARY ? 1 : 2;
        this.embeddedUrl = document.signers.find(signer => signer.id === id).embedded_signing_url;
        if (this.$q.platform.is.mobile) {
          window.location.href = this.embeddedUrl;
        } else {
          this.esignModal = true;
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la requête de signature en ligne du contrat.');
      } finally {
        this.$q.loading.hide();
      }
    },
    hasToBeSignedOnline (contract) {
      return !!(contract.signature && contract.signature.eversignId);
    },
    shouldSignContract (signature) {
      if (!signature.signedBy) return true;

      switch (this.personKey) {
        case COACH:
          return !signature.signedBy.other;
        case AUXILIARY:
          return !signature.signedBy.auxiliary;
      }
    },
    getContractLink (contract) {
      return contract.auxiliaryDoc ? contract.auxiliaryDoc.link : false;
    },
  },
  filters: {
    formatIdentity,
  },
};
</script>

<style lang="stylus" scoped>
  .cell-container
    width: 100%

  .contract-cell
    background: white
    width: 100%
    margin-bottom: 20px

  .cell-title
    font-size: 18px
    padding: 16px 10px
    display: flex
    justify-content: space-between

  .cell-subtitle
    margin:  0 10px 10px
    font-size: 14px

  /deep/ .q-layout-header
    box-shadow: none

  .iframe-normal
    position: absolute
    width: 100%
    height:100%

  .contract-actions
    justify-content: normal !important

</style>
