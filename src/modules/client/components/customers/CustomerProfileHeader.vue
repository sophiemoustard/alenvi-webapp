<template>
  <div class="header">
    <div class="flex-row q-mb-md items-center justify-between">
      <div class="flex-row ellipsis">
        <ni-button class="q-mr-md" icon="arrow_back" color="primary" @click="$router.go(-1)" />
        <h4 class="ellipsis">{{ title }}</h4>
        <ni-button class="q-ml-sm" color="primary" icon="date_range" @click="goToPlanning" />
      </div>
      <ni-button v-if="!customer.stoppedAt" class="bg-pink-500 justify-end" label="Arrêter"
        @click="stopSupportModal=true" color="white" />
    </div>
    <div class="row profile-info column">
      <div class="row items-center">
        <div :class="getDotClass(getStatus(this.customer))" />
        <div>{{ STATUS_TYPES[getStatus(this.customer)] }}</div>
      </div>
      <div class="row items-center">
        <q-icon name="restore" class="q-mr-md" size="1rem" />
        <div class="q-mr-md">Depuis le {{ statusDate }} ({{ relativeStatusDate }})</div>
        <ni-button icon="delete" @click="validateCustomerDeletion" />
      </div>
    </div>

    <stop-support-modal v-model="stopSupportModal" @hide="resetStopSupportModal" @submit="stopSupport"
      :new-status.sync="newStatus" :validations="$v.newStatus" :loading="modalLoading" :customer-name="title"
      :min-date="minStoppingDate" :stopping-date-error-message="setStoppingDateErrorMessage($v.newStatus)" />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { required } from 'vuelidate/lib/validators';
import get from 'lodash/get';
import Customers from '@api/Customers';
import Button from '@components/Button';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import { formatDate, dateDiff, formatDateDiff, getStartOfDay, getEndOfDay } from '@helpers/date';
import { minDate } from '@helpers/vuelidateCustomVal';
import { ACTIVATED, STOPPED, ARCHIVED, STATUS_TYPES, REQUIRED_LABEL } from '@data/constants';
import { customerMixin } from 'src/modules/client/mixins/customerMixin';
import StopSupportModal from './infos/StopSupportModal';

export default {
  name: 'ProfileHeader',
  mixins: [customerMixin],
  props: {
    title: { type: String, required: true },
  },
  components: {
    'ni-button': Button,
    'stop-support-modal': StopSupportModal,
  },
  data () {
    return {
      STATUS_TYPES,
      get,
      getStartOfDay,
      modalLoading: false,
      stopSupportModal: false,
      newStatus: { stopReason: '', stoppedAt: '' },
    };
  },
  computed: {
    ...mapState('customer', ['customer']),
    statusDate () {
      switch (this.getStatus(this.customer)) {
        case ACTIVATED: return formatDate(this.customer.createdAt);
        case STOPPED: return formatDate(this.customer.stoppedAt);
        case ARCHIVED: return formatDate(this.customer.archivedAt);
        default: return 'N/A';
      }
    },
    relativeStatusDate () {
      switch (this.getStatus(this.customer)) {
        case ACTIVATED: return formatDateDiff(dateDiff(new Date(), this.customer.createdAt));
        case STOPPED: return formatDateDiff(dateDiff(new Date(), this.customer.stoppedAt));
        case ARCHIVED: return formatDateDiff(dateDiff(new Date(), this.customer.archivedAt));
        default: return '';
      }
    },
    minStoppingDate () {
      return getStartOfDay(new Date(this.customer.createdAt)).toISOString();
    },
  },
  validations () {
    return {
      newStatus: {
        stoppedAt: {
          required,
          minDate: minDate(this.minStoppingDate),
        },
        stopReason: { required },
      },
    };
  },
  methods: {
    goToPlanning () {
      if (this.customer.subscriptions.length) {
        return this.$router.push({ name: 'ni planning customers', params: { targetedCustomer: this.customer } });
      }

      return NotifyWarning('Ce bénéficiaire n\'a pas de souscription.');
    },
    async deleteCustomer () {
      try {
        await Customers.remove(this.customer._id);
        NotifyPositive('Bénéficiaire supprimé.');
        this.$router.push({ name: 'ni customers' });
      } catch (e) {
        console.error(e);
        if (e.status === 403) NotifyNegative('Vous ne pouvez pas supprimer ce bénéficiaire.');
        if (e.msg) NotifyNegative('Erreur lors de la suppression du bénéficiaire.');
      }
    },
    validateCustomerDeletion () {
      if (this.customer.firstIntervention) return NotifyWarning('Ce bénéficiaire est lié à des interventions.');
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Confirmez-vous la suppression ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(this.deleteCustomer)
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
    getDotClass (value) {
      return {
        'dot dot-active': value === ACTIVATED,
        'dot dot-stopped': value === STOPPED,
        'dot dot-archived': value === ARCHIVED,
      };
    },
    async refreshCustomer () {
      try {
        await this.$store.dispatch('customer/fetchCustomer', { customerId: this.customer._id });
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du chargement des données.');
      }
    },
    setStoppingDateErrorMessage (validations) {
      if (!validations.stoppedAt.minDate) return 'La date d\'arrêt ne peut être antérieure à la date de création.';

      return REQUIRED_LABEL;
    },
    resetStopSupportModal () {
      this.$v.newStatus.$reset();
      this.newStatus = { stopReason: '', stoppedAt: '' };
    },
    async stopSupport () {
      try {
        this.modalLoading = true;
        const payload = {
          stoppedAt: getEndOfDay(new Date(this.newStatus.stoppedAt)),
          stopReason: this.newStatus.stopReason,
        };
        await Customers.updateById(this.customer._id, payload);

        this.stopSupportModal = false;
        NotifyPositive('Bénéficiaire arrêté.');
        await this.refreshCustomer();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'arrêt du bénéficiaire.');
      } finally {
        this.modalLoading = false;
      }
    },
  },
};
</script>

<style lang="stylus" scoped>
  .column
    flex-direction: column
</style>
