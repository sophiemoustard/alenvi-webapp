<template>
  <ni-modal :value="value" @hide="hide" @input="input"
    title="Suppression d'interventions sur une période">
    <ni-select in-modal caption="Bénéficiaire" v-model="deletedEvents.customer"
      :options="getCustomersOptions(deletedEvents.startDate)" required-field @blur="$v.deletedEvents.customer.$touch"
      :error="$v.deletedEvents.customer.$error" />
    <ni-option-group :display-caption="false" v-model="deletedEvents.inRange" type="radio"
      :options="deletetionOptions" inline />
    <template v-if="deletedEvents.inRange">
      <ni-date-input caption="Date de début" v-model="deletedEvents.startDate" type="date" required-field
        in-modal @blur="$v.deletedEvents.startDate.$touch" :error="$v.deletedEvents.startDate.$error" />
      <ni-date-input caption="Date de fin" v-model="deletedEvents.endDate" type="date" required-field in-modal
        :min="deletedEvents.startDate" @blur="$v.deletedEvents.endDate.$touch"
        :error="$v.deletedEvents.endDate.$error" />
    </template>
    <template v-else>
      <ni-date-input caption="Date d'arrêt des interventions" v-model="deletedEvents.startDate" type="date"
        required-field in-modal />
    </template>
    <template slot="footer">
      <q-btn class="modal-btn full-width" color="primary" no-caps :loading="loading" label="Supprimer les interventions"
        @click="validateEventsDeletion" icon-right="clear" />
    </template>
  </ni-modal>
</template>

<script>
import { required, requiredIf } from 'vuelidate/lib/validators';
import omit from 'lodash/omit';
import Events from '@api/Events';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import OptionGroup from '@components/form/OptionGroup';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import { planningModalMixin } from 'src/modules/client/mixins/planningModalMixin';
import { validationMixin } from '@mixins/validationMixin';

export default {
  name: 'DeleteEventsModal',
  mixins: [planningModalMixin, validationMixin],
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
    'ni-option-group': OptionGroup,
  },
  props: {
    value: { type: Boolean, default: false },
    customers: { type: Array, default: () => [] },
  },
  validations () {
    return {
      deletedEvents: {
        customer: { required },
        startDate: { required },
        endDate: { required: requiredIf(item => item.inRange) },
      },
    };
  },
  data () {
    return {
      deletedEvents: { inRange: true },
      deletetionOptions: [
        { label: 'Entre deux dates', value: true },
        { label: 'A partir d\'une date', value: false },
      ],
      loading: false,
    };
  },
  methods: {
    hide () {
      this.deletedEvents = { inRange: true };
      this.$v.deletedEvents.$reset();
      this.$emit('hide');
    },
    input (event) {
      this.$emit('input', event);
    },
    validateEventsDeletion () {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Es-tu sûr de vouloir supprimer ces évènements ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(this.deleteEvents)
        .onCancel(() => NotifyPositive('Suppression annulée'));
    },
    async deleteEvents () {
      try {
        this.loading = true;
        const isValid = await this.waitForFormValidation(this.$v.deletedEvents);
        if (!isValid) return NotifyNegative('Champ(s) invalide(s)');
        await Events.deleteList(omit(this.deletedEvents, 'inRange'));
        this.hide();
        NotifyPositive('Les évènements ont bien étés supprimés');
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Problème lors de la suppression.');
      } finally {
        this.loading = false;
      }
    },
  },
};

</script>

<style lang="stylus" scoped>
/deep/ .q-option-group--inline
    .q-radio
      padding-bottom: 0px !important
</style>
