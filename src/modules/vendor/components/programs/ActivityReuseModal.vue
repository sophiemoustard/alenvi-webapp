<template>
  <ni-modal :value="value" @input="input" @hide="hide" container-class="modal-container-md">
    <template slot="title">
        Réutiliser une <span class="text-weight-bold">activité</span>
      </template>
      <ni-select in-modal v-model.trim="selectedProgram" caption="Programme" required-field :options="programOptions"
        inline @input="refreshActivities" />
      <template v-if="!!selectedProgram && !refreshingActivities">
        <ni-option-group :value="reusedActivity" @input="updateReusedActivity" :options="activityOptions"
          caption="Activités" required-field type="radio" :error="validations.$error" />
        <div class="buttons q-ma-md">
          <q-btn no-caps flat label="Réutiliser l'activité" color="white" :loading="loading"
            @click="submitReuse" />
          <q-btn no-caps flat label="Dupliquer l'activité" color="white" :loading="loading"
            @click="submitDuplication" />
        </div>
      </template>
    </ni-modal>
</template>

<script>
import Programs from '@api/Programs';
import uniqBy from 'lodash/uniqBy';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import OptionGroup from '@components/form/OptionGroup';

export default {
  name: 'ActivityReuseModal',
  props: {
    value: { type: Boolean, default: false },
    sameStepActivities: { type: Array, default: () => [] },
    programOptions: { type: Array, default: () => [] },
    reusedActivity: { type: String, default: '' },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-select': Select,
    'ni-modal': Modal,
    'ni-option-group': OptionGroup,
  },
  data () {
    return {
      selectedProgram: '',
      programIsSelected: false,
      activityOptions: [],
      refreshingActivities: false,
    };
  },
  methods: {
    async refreshActivities () {
      try {
        this.refreshingActivities = true;
        const program = await Programs.getById(this.selectedProgram);

        const reuseableActivities = program.subPrograms
          .map(sp => sp.steps.map(s => s.activities.map(a => ({ label: a.name, value: a._id }))))
          .flat(2)
          .filter(a => !this.sameStepActivities.includes(a.value))
          .sort((a, b) => a.label.localeCompare(b.label));

        this.activityOptions = uniqBy(reuseableActivities, a => a.value);
      } catch (e) {
        this.activityOptions = [];
        console.error(e);
      } finally {
        this.refreshingActivities = false;
        this.updateReusedActivity('');
      }
    },
    updateReusedActivity (value) {
      this.$emit('update:reusedActivity', value);
    },
    hide () {
      this.selectedProgram = '';
      this.$emit('input', event);
    },
    input (event) {
      this.$emit('input', event);
    },
    submitReuse () {
      this.$emit('submit-reuse');
    },
    submitDuplication () {
      this.$emit('submit-duplication');
    },
  },
};
</script>

<style lang="stylus" scoped>

/deep/.q-option-group
  column-count: 2
  width: 100%
  margin-left: 0

/deep/.q-radio
  width: 100%

/deep/.q-radio__label
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.buttons
  display: flex
  justify-content: space-around
  > .q-btn
    background-color: $primary;

</style>
