<template>
  <div class="items-center row justify-around">
    <div class="planning-month col-6">
      <q-btn flat dense icon-right="arrow_drop_down" :label="timelineTitle">
        <q-menu self="top middle" anchor="bottom middle">
          <q-date minimal @input="goToWeek" :value="date" />
        </q-menu>
      </q-btn>
      <div data-cy="week-number" class="week-number"><span>{{ weekNumber }}</span></div>
    </div>
    <div class="planning-navigation-actions col-6">
      <div class="text-copper-grey-800">
        <q-btn data-cy="planning_before" icon="chevron_left" dense flat round @click="goToPreviousWeek()" />
        <q-btn data-cy="planning_after" icon="chevron_right" dense flat round @click="goToNextWeek()" />
        <q-btn data-cy="planning_today" icon="today" dense flat round @click="goToToday" />
      </div>
      <template v-if="$q.platform.is.mobile && isAgenda">
        <q-btn class="planning-view" sizs="sm" flat v-if="!isThreeDaysView" label="3J"
          @click="updateViewMode(THREE_DAYS_VIEW)" />
        <q-btn class="planning-view" sizs="sm" flat v-else label="7J" @click="updateViewMode(WEEK_VIEW)" />
      </template>
      <q-btn v-if="isCoachOrPlanningReferent" icon="highlight_off" flat round dense @click="openDeleteEventsModal" />
      <q-btn v-if="!isAgenda && !isCustomerPlanning" icon="playlist_play" flat round dense
        @click="toggleHistory" :color="displayHistory ? 'primary' : ''" />
    </div>
  </div>
</template>

<script>
import { AGENDA, PLANNING, THREE_DAYS_VIEW, WEEK_VIEW } from '@data/constants';
import moment from '@helpers/moment';

export default {
  name: 'PlanningNavigation',
  props: {
    timelineTitle: { type: String, default: '' },
    targetDate: { type: String, default: '' },
    viewMode: { type: String, default: 'week' },
    type: { type: String, default: PLANNING },
    isCoachOrPlanningReferent: { type: Boolean, default: false },
    isCustomerPlanning: { type: Boolean, default: false },
    displayHistory: { type: Boolean, default: false },
  },
  data () {
    return {
      datimeModal: false,
      THREE_DAYS_VIEW,
      WEEK_VIEW,
    };
  },
  computed: {
    isAgenda () {
      return this.type === AGENDA;
    },
    isThreeDaysView () {
      return this.viewMode === THREE_DAYS_VIEW;
    },
    date () {
      return moment(this.targetDate).format('YYYY/MM/DD');
    },
    weekNumber () {
      return moment(this.targetDate).week();
    },
  },
  methods: {
    goToNextWeek (value) {
      this.$emit('go-to-next-week', value);
    },
    goToPreviousWeek (value) {
      this.$emit('go-to-previous-week', value);
    },
    goToWeek (value) {
      const momentValue = moment(value, 'YYYY/MM/DD', true);
      if (!momentValue.isValid()) return;
      this.$emit('go-to-week', momentValue.toISOString());
    },
    goToToday (value) {
      this.$emit('go-to-today', value);
    },
    updateViewMode (value) {
      this.$emit('update-view-mode', value);
    },
    openDeleteEventsModal (value) {
      this.$emit('open-delete-events-modal', value);
    },
    toggleHistory (value) {
      this.$emit('toggle-history', value);
    },
  },
};
</script>

<style lang="stylus" scoped>
  .planning-history-button
    display: flex;
    align-items: center;

  .planning-month
    align-items: center

  .week-number
    font-size: 12px
    border: solid 1px
    display: flex
    height: 20px
    width: 20px
    border-radius: 50%
    align-content: center
    justify-content: center
</style>
