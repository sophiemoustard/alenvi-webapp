<template>
  <q-dialog v-if="Object.keys(editedEvent).length !== 0" :value="editionModal" @hide="hide">
    <div class="modal-container-md">
      <div class="modal-padding">
        <ni-planning-modal-header v-if="isCustomerPlanning" :value="editedEvent.customer"
          :selected-person="selectedCustomer" @close="close" />
        <ni-planning-modal-header v-else-if="[UNAVAILABILITY, ABSENCE].includes(editedEvent.type)"
          :value="editedEvent.auxiliary" :selected-person="selectedAuxiliary" @close="close" />
        <ni-planning-modal-header v-else :value="editedEvent.auxiliary" @input="update($event, 'auxiliary')"
          :options="auxiliariesOptions" :selected-person="selectedAuxiliary" @close="close"
          :disable="isEventTimeStamped" />
        <div class="modal-subtitle">
          <q-btn-toggle no-wrap :value="editedEvent.type" toggle-color="primary" rounded unelevated
            :options="eventType" />
          <q-btn icon="delete" @click="isRepetition(editedEvent) ? deleteEventRepetition() : deleteEvent()" no-caps flat
            color="grey" v-if="!isBilledIntervention" data-cy="event-deletion-button" />
        </div>
        <template v-if="editedEvent.type !== ABSENCE">
          <ni-datetime-range caption="Dates et heures de l'évènement" :value="editedEvent.dates" required-field
            :disable="isBilledIntervention" :error="validations.dates.$error" @input="update($event, 'dates')"
            @blur="validations.dates.$touch" :disable-start-date="isEventTimeStamped" :max="customerStoppedDate"
            disable-end-date :disable-start-hour="!!editedEvent.startDateTimeStampedCount"
            :disable-end-hour="!!editedEvent.endDateTimeStampedCount" />
        </template>
        <template v-if="editedEvent.type === INTERVENTION">
          <ni-select v-if="isCustomerPlanning" in-modal caption="Auxiliaire" :value="editedEvent.auxiliary"
            :options="auxiliariesOptions" :error="validations.auxiliary.$error" required-field
            @blur="validations.auxiliary.$touch" @input="update($event, 'auxiliary')" />
          <ni-select v-else in-modal caption="Bénéficiaire" :value="editedEvent.customer"
            :options="getCustomersOptions(editedEvent.dates.startDate)" :error="validations.customer.$error"
            required-field disable />
          <ni-select in-modal :options="customerSubscriptionsOptions" @input="update($event, 'subscription')"
            :value="editedEvent.subscription" :error="validations.subscription.$error" caption="Service"
            @blur="validations.subscription.$touch" required-field :disable="isBilledIntervention" />
        </template>
        <template v-if="editedEvent.type === INTERNAL_HOUR">
          <ni-select in-modal caption="Type d'heure interne" :value="editedEvent.internalHour"
            :options="internalHourOptions" :error="validations.internalHour.$error"
            @blur="validations.internalHour.$touch" @input="update($event, 'internalHour')" />
          <ni-search-address :value="editedEvent.address" in-modal @blur="validations.address.$touch"
            :error="validations.address.$error" :error-message="addressError" @input="update($event, 'address')" />
        </template>
        <template v-if="isRepetition(editedEvent) && !isBilledIntervention && !editedEvent.isCancelled">
          <div class="row q-mb-md light-checkbox">
            <q-checkbox :value="editedEvent.shouldUpdateRepetition" label="Appliquer à la répétition"
              @input="toggleRepetition" dense />
          </div>
        </template>
        <template v-if="editedEvent.type === ABSENCE">
          <div v-if="!!editedEvent.extension"><div class="q-mb-md infos">{{ extensionInfos }}</div></div>
          <ni-select in-modal caption="Nature" :value="editedEvent.absenceNature" :options="absenceNatureOptions"
            :error="validations.absenceNature.$error" required-field disable />
          <ni-select in-modal caption="Type d'absence" :value="editedEvent.absence" :options="absenceOptions"
            :error="validations.absence.$error" required-field @blur="validations.absence.$touch"
            :disable="isHourlyAbsence(editedEvent)" @input="updateAbsence($event)" />
          <ni-datetime-range caption="Dates et heures de l'évènement" :value="editedEvent.dates" required-field
            :disable-end-date="isHourlyAbsence(editedEvent)" :error="validations.dates.$error"
            @blur="validations.dates.$touch" :disable-end-hour="isDailyAbsence(editedEvent)"
            :disable-start-hour="!isIllnessOrWorkAccident(editedEvent)" @input="update($event, 'dates')" />
          <ni-file-uploader v-if="isIllnessOrWorkAccident(editedEvent)" caption="Justificatif d'absence" required-field
            path="attachment" :entity="editedEvent" alt="justificatif absence" name="file" :url="docsUploadUrl"
            @uploaded="documentUploaded" :additional-value="additionalValue" :disable="!selectedAuxiliary._id"
            :error="validations.attachment.$error" @delete="deleteDocument(editedEvent.attachment.driveId)" in-modal
            :extensions="extensions" drive-storage />
        </template>
        <ni-input in-modal v-if="!editedEvent.shouldUpdateRepetition" :value="editedEvent.misc" caption="Notes"
          :disable="isBilledIntervention" @blur="validations.misc.$touch" :error="validations.misc.$error"
          :required-field="isMiscRequired" @input="update($event, 'misc')" />
        <template v-if="canCancel">
          <div class="row q-mb-md light-checkbox">
            <q-checkbox :value="editedEvent.isCancelled" label="Annuler l'évènement" dense
            @input="toggleCancellationForm($event)" />
          </div>
          <div class="row justify-between">
            <ni-select in-modal v-if="editedEvent.isCancelled" :value="editedEvent.cancel.condition" required-field
              caption="Conditions" :options="cancellationConditions" @blur="validations.cancel.condition.$touch"
              :error="validations.cancel.condition.$error" @input="update($event, 'cancel.condition')" />
            <ni-select in-modal v-if="editedEvent.isCancelled" :value="editedEvent.cancel.reason" caption="Motif"
              :options="cancellationReasons" required-field @blur="validations.cancel.reason.$touch"
              :error="validations.cancel.reason.$error" @input="update($event, 'cancel.reason')" />
          </div>
        </template>
        <div class="q-mb-lg">
          <div class="flex-row items-center justify-between">
            <div class="flex-row">
              <q-icon size="sm" name="history" class="q-mr-sm" color="grey-400" />
              <div class="history-list-title text-weight-bold">Activité</div>
            </div>
            <ni-button :label="historyButtonLabel" color="grey-800" class="bg-grey-100" @click="toggleHistory" />
          </div>
          <div v-if="displayHistory" class="q-mt-sm">
            <ni-event-history v-for="history in editedEvent.histories" :key="history._id" :history="history" />
          </div>
        </div>
      </div>
      <div v-if="editedEvent.type === INTERVENTION && customerAddressList(editedEvent).length > 0"
        class="customer-info">
        <div class="row items-center no-wrap">
          <q-select borderless dense :value="editedEvent.address" @input="updateAddress" emit-value behavior="menu"
            :options="customerAddressList(editedEvent)" :readonly="customerAddressList(editedEvent).length === 1"
            :display-value="editedEvent.address.fullAddress" ref="addressSelect">
            <template #append v-if="customerAddressList(editedEvent).length > 1">
              <ni-button icon="swap_vert" class="select-icon pink-icon" @click.stop="toggleAddressSelect" />
            </template>
          </q-select>
          <q-btn flat size="md" color="primary" icon="mdi-information-outline" :to="customerProfileRedirect" />
        </div>
      </div>
      <q-btn v-if="!isBilledIntervention" class="modal-btn full-width" no-caps color="primary" :loading="loading"
        label="Editer l'évènement" @click="submit" icon-right="check" data-cy="event-edition-button" />
    </div>
  </q-dialog>
</template>

<script>
import get from 'lodash/get';
import set from 'lodash/set';
import Button from '@components/Button';
import { INTERVENTION, ABSENCE, OTHER, NEVER, ABSENCE_TYPES } from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import moment from '@helpers/moment';
import { planningModalMixin } from 'src/modules/client/mixins/planningModalMixin';
import NiEventHistory from 'src/modules/client/components/planning/EventHistory';

export default {
  name: 'EventEditionModal',
  mixins: [planningModalMixin],
  props: {
    editedEvent: { type: Object, default: () => ({}) },
    editionModal: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    activeAuxiliaries: { type: Array, default: () => [] },
    customers: { type: Array, default: () => [] },
    internalHours: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    personKey: { type: String, default: () => '' },
  },
  components: {
    'ni-button': Button,
    'ni-event-history': NiEventHistory,
  },
  data () {
    return {
      displayHistory: false,
    };
  },
  computed: {
    historyButtonLabel () {
      return this.displayHistory ? 'Masquer les détails' : 'Afficher les détails';
    },
    selectedCustomer () {
      if (!this.editedEvent.customer) return {};
      return this.customers.find(customer => customer._id === this.editedEvent.customer);
    },
    selectedAuxiliary () {
      if (!this.editedEvent.auxiliary || !this.activeAuxiliaries.length) return { identity: {} };
      const aux = this.activeAuxiliaries.find(a => a._id === this.editedEvent.auxiliary);
      const hasContractOnEvent = this.hasContractOnEvent(aux, this.editedEvent.dates.startDate);

      return { ...aux, hasContractOnEvent };
    },
    eventType () {
      return this.eventTypeOptions.filter(option => option.value === this.editedEvent.type);
    },
    isBilledIntervention () {
      return this.editedEvent.type === INTERVENTION && this.editedEvent.isBilled;
    },
    canCancel () {
      return this.editedEvent.type === INTERVENTION &&
      !this.editedEvent.shouldUpdateRepetition &&
      !this.isBilledIntervention &&
      !this.editedEvent.startDateTimeStampedCount &&
      !this.editedEvent.endDateTimeStampedCount;
    },
    auxiliaryFilterPlaceholder () {
      return this.selectedAuxiliary.identity
        ? formatIdentity(this.selectedAuxiliary.identity, 'FL')
        : 'À affecter';
    },
    isMiscRequired () {
      return (this.editedEvent.type === ABSENCE && this.editedEvent.absence === OTHER) || this.editedEvent.isCancelled;
    },
    extensionInfos () {
      const nature = ABSENCE_TYPES.find(abs => abs.value === this.editedEvent.absence);
      const startDate = moment(this.editedEvent.extension.startDate).format('DD/MM/YYYY');

      return `Cette absence est une prolongation de ${nature.label.toLowerCase()} commencant le ${startDate}`;
    },
    customerStoppedDate () {
      return get(this.selectedCustomer, 'stoppedAt') || '';
    },
    isEventTimeStamped () {
      return !!this.editedEvent.startDateTimeStampedCount || !!this.editedEvent.endDateTimeStampedCount;
    },
  },
  methods: {
    toggleHistory () {
      this.displayHistory = !this.displayHistory;
    },
    toggleCancellationForm (value) {
      if (!value) {
        this.$emit('update:edited-event', {
          ...this.editedEvent,
          cancel: {},
          isCancelled: !this.editedEvent.isCancelled,
        });
      } else {
        this.$emit('update:edited-event', { ...this.editedEvent, isCancelled: !this.editedEvent.isCancelled });
        this.validations.misc.$touch();
        this.validations.cancel.$touch();
      }
    },
    toggleRepetition () {
      this.$emit('update:edited-event', {
        ...this.editedEvent,
        cancel: {},
        isCancelled: false,
        shouldUpdateRepetition: !this.editedEvent.shouldUpdateRepetition,
      });
    },
    isRepetition (event) {
      return ABSENCE !== event.type && event.repetition && event.repetition.frequency !== NEVER;
    },
    close () {
      this.$emit('close');
    },
    hide (partialReset, type) {
      this.displayHistory = false;
      this.$emit('hide', { partialReset, type });
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
    deleteEventRepetition (value) {
      this.$emit('delete-event-repetition', value);
    },
    deleteEvent (value) {
      this.$emit('delete-event', value);
    },
    toggleAddressSelect () {
      const addressList = this.customerAddressList(this.editedEvent);
      const addressIndex = addressList.findIndex(ev => this.editedEvent.address.fullAddress === ev.label);
      if (addressIndex === 0) this.update(addressList[1].value, 'address');
      else this.update(addressList[0].value, 'address');
    },
    update (event, path) {
      this.$emit('update:editedEvent', set({ ...this.editedEvent }, path, event));
    },
    updateAbsence (event) {
      this.$emit('update:editedEvent', { ...this.editedEvent, absence: event });
      this.setDateHours(this.editedEvent, 'editedEvent');
    },
    updateAddress (event) {
      this.$emit('update:editedEvent', { ...this.editedEvent, address: event });
      this.deleteClassFocus();
    },
  },
};
</script>

<style lang="stylus" scoped>
  .modal-subtitle
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    /deep/ .q-btn-toggle
      margin-bottom: 0;
      width: 33%;
      @media screen and (max-width: 767px)
        width: 100%

  .light-checkbox
    color: $grey-400
    font-size: 14px

  .infos
    font-style: italic;
    color: $grey-400;

  .history-list-title
    font-size: 14px

</style>
