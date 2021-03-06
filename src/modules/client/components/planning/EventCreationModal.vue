<template>
  <q-dialog v-if="Object.keys(newEvent).length !== 0" :value="creationModal" @hide="reset(false)">
    <div class="modal-container-md">
      <div class="modal-padding">
        <ni-planning-modal-header v-if="isCustomerPlanning" :value="newEvent.customer"
          :selected-person="selectedCustomer" @close="close" />
        <ni-planning-modal-header v-else :value="newEvent.auxiliary" :options="auxiliariesOptions"
          :selected-person="selectedAuxiliary" @close="close" @update:sector="updateSectorEvent"
          @input="update($event, 'auxiliary')" />
        <div class="modal-subtitle">
          <q-btn-toggle no-wrap :value="newEvent.type" unelevated toggle-color="primary" :options="eventTypeOptions"
            @input="updateType($event)" text-color="copper-grey-700" />
        </div>
        <template v-if="newEvent.type !== ABSENCE">
          <ni-datetime-range caption="Dates et heures de l'évènement" :value="newEvent.dates" required-field
            :error="validations.dates.$error" @blur="validations.dates.$touch" disable-end-date
            @input="update($event, 'dates')" :max="customerStoppedDate" />
        </template>
        <template v-if="newEvent.type === INTERVENTION">
          <ni-select v-if="isCustomerPlanning" in-modal caption="Auxiliaire" :value="newEvent.auxiliary"
            :options="auxiliariesOptions" :error="validations.auxiliary.$error" required-field
            @blur="validations.auxiliary.$touch" @input="update($event, 'auxiliary')" />
          <ni-select v-else in-modal caption="Bénéficiaire" :value="newEvent.customer"
            :options="getCustomersOptions(newEvent.dates.startDate)" :error="validations.customer.$error" required-field
            @blur="validations.customer.$touch" @input="updateCustomer($event)" data-cy="event-creation-customer" />
          <ni-select in-modal caption="Service" :value="newEvent.subscription" :error="validations.subscription.$error"
            :options="customerSubscriptionsOptions" required-field @blur="validations.subscription.$touch"
            data-cy="event-creation-service" @input="update($event, 'subscription')" />
        </template>
        <template v-if="newEvent.type === ABSENCE">
          <ni-select in-modal caption="Nature" :value="newEvent.absenceNature" :options="absenceNatureOptions"
            :error="validations.absenceNature.$error" required-field @blur="validations.absenceNature.$touch"
            @input="updateAbsenceNature($event)" />
          <ni-select in-modal caption="Type d'absence" :value="newEvent.absence" :options="absenceOptions"
            :error="validations.absence.$error" required-field @blur="validations.absence.$touch"
            :disable="isHourlyAbsence(newEvent)" @input="updateAbsence($event)" />
          <ni-datetime-range caption="Dates et heures de l'évènement" :value="newEvent.dates" required-field
            :disable-end-date="isHourlyAbsence(newEvent)" :error="validations.dates.$error"
            @blur="validations.dates.$touch" :disable-end-hour="isDailyAbsence(newEvent)"
            :disable-start-hour="!isIllnessOrWorkAccident(newEvent) && !isHourlyAbsence(newEvent)"
            @input="updateDates($event)" />
          <q-checkbox v-show="canExtendAbsence" class="q-mb-sm" :value="newEvent.isExtendedAbsence"
            @input="updateCheckBox" label="Prolongation" dense />
          <ni-select v-if="newEvent.isExtendedAbsence" :value="newEvent.extension" @input="update($event, 'extension')"
            required-field in-modal caption="Absence" :options="extendedAbsenceOptions"
            @blur="validations.extension.$touch" :error="validations.extension.$error" />
          <ni-file-uploader v-if="isIllnessOrWorkAccident(newEvent)" caption="Justificatif d'absence" path="attachment"
            :entity="newEvent" alt="justificatif absence" name="file" :url="docsUploadUrl" @uploaded="documentUploaded"
            :additional-value="additionalValue" required-field in-modal :disable="!selectedAuxiliary._id"
            :error="validations.attachment.link.$error" @delete="deleteDocument(newEvent.attachment.driveId)"
            :extensions="extensions" drive-storage />
        </template>
        <template v-if="newEvent.type === INTERNAL_HOUR">
          <ni-select in-modal caption="Type d'heure interne" :value="newEvent.internalHour"
            :options="internalHourOptions" required-field :error="validations.internalHour.$error"
            @blur="validations.internalHour.$touch" @input="update($event, 'internalHour')" />
        </template>
        <template v-if="newEvent.type !== ABSENCE && newEvent.repetition">
          <ni-select in-modal caption="Répétition de l'évènement" :value="newEvent.repetition.frequency"
            :options="repetitionOptions" required-field @blur="validations.repetition.frequency.$touch"
            :disable="!isRepetitionAllowed" @input="update($event, 'repetition.frequency')" />
        </template>
        <template v-if="newEvent.type === INTERNAL_HOUR">
          <ni-search-address :value="newEvent.address" :error-message="addressError" @blur="validations.address.$touch"
            :error="validations.address.$error" in-modal @input="update($event, 'address')" />
        </template>
        <ni-input in-modal :value="newEvent.misc" caption="Notes" @blur="validations.misc.$touch"
          :error="validations.misc.$error" :required-field="newEvent.type === ABSENCE && newEvent.absence === OTHER"
          @input="update($event, 'misc')" />
      </div>
      <div v-if="newEvent.type === INTERVENTION && customerAddressList(newEvent).length > 0" class="customer-info">
        <div class="row items-center no-wrap">
          <q-select borderless dense :value="newEvent.address" @input="updateCustomerAddress($event)" emit-value
            :options="customerAddressList(newEvent)" :readonly="customerAddressList(newEvent).length === 1"
            :display-value="newEvent.address.fullAddress" ref="addressSelect" behavior="menu">
            <template #append v-if="customerAddressList(newEvent).length > 1">
              <ni-button icon="swap_vert" class="select-icon primary-icon" @click.stop="toggleAddressSelect" />
            </template>
          </q-select>
        </div>
      </div>
      <q-btn class="full-width modal-btn" no-caps :loading="loading" label="Créer l'évènement" color="primary"
        @click="submit" icon-right="add" data-cy="event-creation-button" />
    </div>
  </q-dialog>
</template>

<script>
import get from 'lodash/get';
import set from 'lodash/set';
import Events from '@api/Events';
import Button from '@components/Button';
import {
  ABSENCE,
  INTERNAL_HOUR,
  HOURLY,
  UNJUSTIFIED,
  INTERVENTION,
  NEVER,
  MATERNITY_LEAVE,
  PATERNITY_LEAVE,
  PARENTAL_LEAVE,
  WORK_ACCIDENT,
  TRANSPORT_ACCIDENT,
  ILLNESS,
} from '@data/constants';
import moment from '@helpers/moment';
import { planningModalMixin } from 'src/modules/client/mixins/planningModalMixin';

export default {
  name: 'EventCreationModal',
  mixins: [planningModalMixin],
  props: {
    newEvent: { type: Object, default: () => ({}) },
    creationModal: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    activeAuxiliaries: { type: Array, default: () => [] },
    customers: { type: Array, default: () => [] },
    internalHours: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    personKey: { type: String, default: () => '' },
  },
  components: {
    'ni-button': Button,
  },
  data () {
    return {
      extendedAbsenceOptions: [],
    };
  },
  computed: {
    isEndDurationRequired () {
      if (this.newEvent.type !== ABSENCE) return false;

      return moment(this.newEvent.dates.endDate).isAfter(moment(this.newEvent.dates.startDate));
    },
    isContractValidForRepetition () {
      if (!this.selectedAuxiliary.contracts || this.selectedAuxiliary.contracts.length === 0) return false;

      return this.selectedAuxiliary.contracts.some(contract => !contract.endDate);
    },
    isRepetitionAllowed () {
      if (!this.newEvent.auxiliary) return true;
      if (this.newEvent.auxiliary !== '') return this.isContractValidForRepetition;

      return true;
    },
    selectedCustomer () {
      if (!this.newEvent.customer) return { identity: {} };
      return this.customers.find(customer => customer._id === this.newEvent.customer);
    },
    selectedAuxiliary () {
      if (!this.newEvent.auxiliary || !this.activeAuxiliaries.length) return { identity: {} };
      const aux = this.activeAuxiliaries.find(a => a._id === this.newEvent.auxiliary);
      const hasContractOnEvent = this.hasContractOnEvent(aux, this.newEvent.dates.startDate);

      return { ...aux, hasContractOnEvent };
    },
    canExtendAbsence () {
      return [
        MATERNITY_LEAVE,
        PATERNITY_LEAVE,
        PARENTAL_LEAVE,
        WORK_ACCIDENT,
        TRANSPORT_ACCIDENT,
        ILLNESS,
      ].includes(this.newEvent.absence);
    },
    customerStoppedDate () {
      return get(this.selectedCustomer, 'stoppedAt') || '';
    },
  },
  watch: {
    selectedAuxiliary (value) {
      if (!this.selectedAuxiliary.hasContractOnEvent && this.newEvent.type === INTERNAL_HOUR) {
        this.$emit('update:newEvent', { ...this.newEvent, type: INTERVENTION });
      }
    },
    isRepetitionAllowed (value) {
      if (!value) {
        this.$emit('update:newEvent', {
          ...this.newEvent,
          repetition: { ...this.newEvent.repetition, frequency: NEVER },
        });
      }
    },
    'newEvent.absence': function () {
      this.getAbsences();
    },
    'newEvent.dates.startDate': function () {
      this.getAbsences();
    },
  },
  methods: {
    close () {
      this.$emit('close');
    },
    reset (partialReset, type) {
      this.extendedAbsenceOptions = [];
      this.$emit('reset', { partialReset, type });
    },
    deleteDocument (value) {
      this.$emit('delete-document', value);
    },
    documentUploaded (value) {
      this.$emit('document-uploaded', value);
    },
    submit (value) {
      this.$emit('submit', value);
    },
    resetAbsenceType () {
      if (this.newEvent.type === ABSENCE && this.newEvent.absenceNature === HOURLY) {
        this.$emit('update:newEvent', { ...this.newEvent, absence: UNJUSTIFIED });
      }
    },
    updateSectorEvent (auxId) {
      const auxiliary = this.activeAuxiliaries.find(aux => aux._id === auxId);
      this.$emit('update:newEvent', { ...this.newEvent, sector: auxiliary ? auxiliary.sector._id : '' });
    },
    setEventAddressAndSubscription () {
      const payload = {
        ...this.newEvent,
        address: get(this.selectedCustomer, 'contact.primaryAddress', {}),
      };
      const cusSubNotArchived = this.customerSubscriptionsOptions.filter(sub => !sub.disable);
      if (cusSubNotArchived.length === 1) payload.subscription = cusSubNotArchived[0].value;
      this.$emit('update:newEvent', payload);
    },
    toggleAddressSelect () {
      const addressList = this.customerAddressList(this.newEvent);
      const addressIndex = addressList.findIndex(ev => this.newEvent.address.fullAddress === ev.label);
      if (addressIndex === 0) this.update(addressList[1].value, 'address');
      else this.update(addressList[0].value, 'address');
    },
    update (event, path) {
      this.$emit('update:newEvent', set({ ...this.newEvent }, path, event));
    },
    async updateCustomer (event) {
      await this.$emit('update:newEvent', { ...this.newEvent, customer: event });
      this.setEventAddressAndSubscription();
    },
    async updateType (event) {
      await this.$emit('update:newEvent', { ...this.newEvent, type: event });
      this.reset(true, event);
    },
    async updateAbsenceNature (event) {
      await this.$emit(
        'update:newEvent',
        { ...this.newEvent, absenceNature: event, extension: '', isExtendedAbsence: false }
      );
      this.resetAbsenceType();
    },
    async updateAbsence (event) {
      await this.$emit('update:newEvent', { ...this.newEvent, absence: event, isExtendedAbsence: false });
      this.setDateHours(this.newEvent, 'newEvent');
    },
    async updateCustomerAddress (event) {
      await this.$emit('update:newEvent', { ...this.newEvent, address: event });
      this.deleteClassFocus();
    },
    async updateDates (event) {
      await this.$emit('update:newEvent', { ...this.newEvent, dates: event });
    },
    async updateCheckBox (event) {
      if (!this.newEvent.isExtendedAbsence) await this.getAbsences();
      await this.$emit('update:newEvent', { ...this.newEvent, isExtendedAbsence: !this.newEvent.isExtendedAbsence });
    },
    async getAbsences () {
      await this.$emit('update:newEvent', { ...this.newEvent, extension: '' });
      const auxiliaryEvents = await Events.list({ auxiliary: this.selectedAuxiliary._id, type: ABSENCE });

      this.extendedAbsenceOptions = auxiliaryEvents
        .filter(e => e.absence === this.newEvent.absence &&
            moment(e.startDate).isBefore(this.newEvent.dates.startDate))
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .map(a => ({
          label: `${moment(a.startDate).format('DD/MM/YYYY')} - ${moment(a.endDate).format('DD/MM/YYYY')}`,
          value: a._id,
        }));
    },
  },
};
</script>

<style lang="stylus" scoped>
  /deep/ .q-btn-toggle
    width: 100%
    @media screen and (max-width: 767px)
      display: inline-flex
      flex-wrap: wrap
    & .q-btn-item
      width: 24%
      border-radius: 20px
      margin: 5px
      background-color: $copper-grey-300
      @media screen and (max-width: 767px)
        width: 45%

</style>
