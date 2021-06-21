<template>
  <div :class="[{ 'planning': !drawer }]">
    <div class="row items-center planning-header" ref="planningHeader">
      <div class="col-xs-12 col-md-5 planning-search">
        <ni-chips-autocomplete ref="refFilter" v-model="terms" :disable="displayAllSectors" :filters="filters"
          data-cy="planning-search" />
        <q-btn v-if="!isCustomerPlanning && isCoach" flat round :icon="displayAllSectors ? 'arrow_forward' : 'people'"
          @click="toggleAllSectors" :color="displayAllSectors ? 'primary' : ''" />
      </div>
      <div class="col-xs-12 col-md-7">
        <planning-navigation :timeline-title="timelineTitle()" :target-date="targetDate" :type="PLANNING"
          @go-to-next-week="goToNextWeek" @go-to-previous-week="goToPreviousWeek" @go-to-today="goToToday"
          @go-to-week="goToWeek" :is-coach-or-planning-referent="isCoach || isPlanningReferent"
          :is-customer-planning="isCustomerPlanning" @open-delete-events-modal="openDeleteEventsModal"
          @toggle-history="toggleHistory" :display-history="displayHistory" />
      </div>
    </div>
    <div class="planning-container full-width">
      <table :class="[staffingView ? 'staffing' : 'non-staffing', 'planning-table']">
        <thead>
          <th :style="{ top: `${planningHeaderHeight}px`}" :class="{ 'bottom-border': uniqPersons.length > 0 }">
            <q-btn v-if="!isCustomerPlanning" flat round icon="view_week" :color="staffingView ? 'primary' : ''"
              @click="staffingView = !staffingView" />
          </th>
          <th :style="{ top: `${planningHeaderHeight}px`}" :class="{ 'bottom-border': uniqPersons.length > 0 }"
            :key="index" v-for="(day, index) in daysHeader" class="capitalize">
            <div class="row justify-center items-baseline days-header">
              <div class="days-name q-mr-md">{{ day.name }}</div>
              <div :class="['days-number', { 'current-day': isCurrentDay(day.moment) }]">{{ day.number }}</div>
              <div v-if="isHoliday(day.moment)" class="holiday">JF</div>
            </div>
            <div class="planning-background" v-if="staffingView">
              <template v-for="(hour, hourIndex) in hours">
                <div class="planning-hour" v-if="hourIndex !== 0" :key="hourIndex"
                  :style="{ left: `${(hourIndex * hourWidth * 2) - 3}%` }">
                  {{ hour.format('H') }}
                </div>
              </template>
            </div>
          </th>
        </thead>
        <tbody>
          <template v-for="sectorId in Object.keys(personsGroupedBySector)">
            <tr v-if="!isCustomerPlanning && getSector(sectorId)" :key="sectorId" class="to-assign person-row">
              <td valign="top">
                <div class="person-inner-cell">
                  <div :class="[!staffingView && 'q-mb-md', 'chip-container']">
                    <img :src="UNKNOWN_AVATAR" class="avatar">
                    <q-chip small text-color="white">
                      <span class="chip-indicator">{{ Math.round(unassignedHourCount(sectorId)) }}h</span>
                    </q-chip>
                  </div>
                  <div class="person-name overflow-hidden">{{ getSector(sectorId).label }}</div>
                </div>
              </td>
              <td @drop="drop(day, getSector(sectorId))" @dragover.prevent v-for="(day, dayIndex) in days" valign="top"
                :key="dayIndex" @click="openEventCreationModal({ dayIndex, sectorId })" class="planning-background">
                <div v-for="hourIndex in 5" class="line" :style="{ left: `${(hourIndex * hourWidth * 2)}%` }"
                  :key="`hour_${hourIndex}`" />
                <ni-planning-event-cell v-for="(event, eventIndex) in getCellEvents(sectorId, days[dayIndex])"
                  :event="event" :display-staffing-view="staffingView && !isCustomerPlanning" :person-key="personKey"
                  :key="eventIndex" @drag="drag" @click="openEventEditionModal" :can-drag="canDrag" />
              </td>
            </tr>
            <tr class="person-row" v-for="person in personsGroupedBySector[sectorId]" :key="person._id"
              data-cy="planning-row">
              <td valign="top">
                <ni-chip-customer-indicator v-if="isCustomerPlanning" :person="person" :events="getPersonEvents(person)"
                  :staffing-view="staffingView" :start-of-week="startOfWeek" />
                <ni-chip-auxiliary-indicator v-else :person="person" :events="getPersonEvents(person)"
                  :start-of-week="startOfWeek" :working-stats="workingStats[person._id]"
                  :staffing-view="staffingView" />
              </td>
              <td @drop="drop(day, person)" @dragover.prevent v-for="(day, dayIndex) in days" :key="dayIndex"
                valign="top" @click="openEventCreationModal({ dayIndex, person })" class="planning-background"
                data-cy="planning-cell">
                <div v-for="hourIndex in hours.length" class="line" :key="`hour_${hourIndex}`"
                  :style="{ left: `${(hourIndex * hourWidth * 2)}%` }" />
                <ni-planning-event-cell v-for="(event, eventIndex) in getCellEvents(person._id, days[dayIndex])"
                  :event="event" :display-staffing-view="staffingView && !isCustomerPlanning" :person-key="personKey"
                  :key="eventIndex" @drag="drag" @click="openEventEditionModal" :can-drag="canDrag"
                  data-cy="planning-event" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <delete-events-modal v-model="deleteEventsModal" @hide="hideDeleteEventsModal"
      :customers="customersWithInterventions" />
    <q-page-sticky expand position="right">
      <ni-event-history-feed v-if="displayHistory" :event-histories="eventHistories" @toggle-history="toggleHistory"
        @update-feeds="$emit('update-feeds', $event)" />
    </q-page-sticky>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex';
import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import Customers from '@api/Customers';
import { NotifyNegative, NotifyWarning } from '@components/popup/notify';
import {
  PLANNING,
  INVOICED_AND_PAID,
  SECTOR,
  STAFFING_VIEW_START_HOUR,
  STAFFING_VIEW_END_HOUR,
  UNKNOWN_AVATAR,
  PLANNING_REFERENT,
  COACH_ROLES,
  NOT_INVOICED_AND_NOT_PAID,
} from '@data/constants';
import moment from '@helpers/moment';
import NiPlanningEvent from 'src/modules/client/components/planning/PlanningEvent';
import ChipAuxiliaryIndicator from 'src/modules/client/components/planning/ChipAuxiliaryIndicator';
import ChipCustomerIndicator from 'src/modules/client/components/planning/ChipCustomerIndicator';
import NiEventHistoryFeed from 'src/modules/client/components/planning/EventHistoryFeed';
import ChipsAutocomplete from 'src/modules/client/components/planning/ChipsAutocomplete';
import DeleteEventsModal from 'src/modules/client/components/planning/DeleteEventsModal';
import { planningTimelineMixin } from 'src/modules/client/mixins/planningTimelineMixin';
import PlanningNavigation from 'src/modules/client/components/planning/PlanningNavigation';
import { planningEventMixin } from 'src/modules/client/mixins/planningEventMixin';

export default {
  name: 'PlanningManager',
  mixins: [planningTimelineMixin, planningEventMixin],
  components: {
    'ni-planning-event-cell': NiPlanningEvent,
    'ni-chips-autocomplete': ChipsAutocomplete,
    'planning-navigation': PlanningNavigation,
    'ni-event-history-feed': NiEventHistoryFeed,
    'delete-events-modal': DeleteEventsModal,
    'ni-chip-customer-indicator': ChipCustomerIndicator,
    'ni-chip-auxiliary-indicator': ChipAuxiliaryIndicator,
  },
  props: {
    workingStats: { type: Object, default: () => ({}) },
    events: { type: Object, default: () => ({}) },
    persons: { type: Array, default: () => [] },
    filteredSectors: { type: Array, default: () => [] },
    personKey: { type: String, default: 'auxiliary' },
    canEdit: { type: Function, default: () => {} },
    displayAllSectors: { type: Boolean, default: false },
    displayHistory: { type: Boolean, default: false },
    eventHistories: { type: Array, default: () => [] },
    filters: { type: Array, default: () => [] },
  },
  data () {
    return {
      terms: [],
      loading: false,
      draggedObject: {},
      startOfWeek: moment().startOf('week').toISOString(),
      days: [],
      maxDays: 7,
      staffingView: false,
      PLANNING,
      hourWidth: 100 / 12,
      UNKNOWN_AVATAR,
      deleteEventsModal: false,
      customersWithInterventions: [],
      planningHeaderHeight: 0,
      timeout: null,
    };
  },
  beforeDestroy () {
    if (this.isCoach) {
      if (!this.isCustomerPlanning) {
        this.$q.localStorage.set('lastSearchAuxiliaries', JSON.stringify(this.terms));
      } else {
        this.$q.localStorage.set('lastSearchCustomers', JSON.stringify(this.terms));
      }
    }
    clearTimeout(this.timeout);
  },
  async mounted () {
    this.updateTimeline();
    this.getTimelineHours();
  },
  computed: {
    ...mapState('main', ['loggedUser']),
    ...mapGetters({ clientRole: 'main/getClientRole' }),
    isCoach () {
      return COACH_ROLES.includes(this.clientRole);
    },
    isPlanningReferent () {
      return this.clientRole === PLANNING_REFERENT;
    },
    personsGroupedBySector () {
      return this.isCustomerPlanning ? { allSectors: this.uniqPersons } : groupBy(this.uniqPersons, 'sector._id');
    },
    uniqPersons () {
      return uniqBy(this.persons, '_id');
    },
  },
  methods: {
    hideDeleteEventsModal () {
      this.deleteEventsModal = false;
      this.$emit('refresh');
    },
    async openDeleteEventsModal () {
      try {
        this.customersWithInterventions = await Customers.listWithIntervention();
        this.deleteEventsModal = true;
      } catch (e) {
        this.customersWithInterventions = [];
        this.deleteEventsModal = false;
        console.error(e);
        NotifyNegative('Error lors de la récupération des bénéficiaires.');
      }
    },
    toggleAllSectors () {
      this.$emit('toggle-all-sectors', this.terms);
      this.terms = [];
    },
    getSector (sectorId) {
      return this.filteredSectors.find(s => s._id === sectorId);
    },
    restoreFilter (terms) {
      for (const term of terms) {
        setTimeout(() => this.$refs.refFilter.add(term), 100);
      }
    },
    getTimelineHours () {
      const range = moment.range(
        moment().hours(STAFFING_VIEW_START_HOUR).minutes(0),
        moment().hours(STAFFING_VIEW_END_HOUR).minutes(0)
      );
      this.hours = Array.from(range.by('hours', { step: 2, excludeEnd: true }));
    },
    updatePlanningHeaderHeight () {
      this.timeout = setTimeout(() => { this.planningHeaderHeight = this.$refs.planningHeader.clientHeight; }, 100);
    },
    // Table
    updateTimeline () {
      this.getTimelineDays();
      this.$emit('update-start-of-week', { startOfWeek: this.startOfWeek });
    },
    // Event display
    unassignedHourCount (sectorId) {
      const unassignedEvents = this.getPersonEvents({ _id: sectorId });
      const total = unassignedEvents.reduce(
        (acc, event) => acc + moment(event.endDate).diff(event.startDate, 'm', true),
        0
      );

      return total / 60;
    },
    getRowEvents (rowId) {
      return this.events[rowId] || [];
    },
    getCellEvents (cellId, day) {
      return this.getRowEvents(cellId)
        .filter(event => moment(day).isBetween(event.startDate, event.endDate, 'day', '[]') &&
          (!this.staffingView || !event.isCancelled))
        .map(event => this.getDisplayedEvent(event, day, STAFFING_VIEW_START_HOUR, STAFFING_VIEW_END_HOUR))
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },
    getPersonEvents (person) {
      if (this.isCustomerPlanning) {
        return this.getRowEvents(person._id)
          .filter(event => !event.isCancelled || event.cancel.condition !== NOT_INVOICED_AND_NOT_PAID);
      }

      return this.getRowEvents(person._id)
        .filter(event => !event.isCancelled || event.cancel.condition === INVOICED_AND_PAID);
    },
    // History
    toggleHistory () {
      if (this.uniqPersons.length === 0) return;
      this.$emit('toggle-history', !this.displayHistory);
    },
    // Drag & drop
    drag (event) {
      this.draggedObject = event;
    },
    async drop (toDay, target) {
      try {
        if (target.type === SECTOR) { // Unassign event
          const dropToSameSector = this.draggedObject.sector === target._id &&
            !get(this.draggedObject, 'auxiliary._id');
          const dropToSameDay = toDay.isSame(this.draggedObject.startDate, 'd');
          if (dropToSameSector && dropToSameDay) return;
        } else if (this.draggedObject[this.personKey] && this.draggedObject[this.personKey]._id === target._id &&
            toDay.isSame(this.draggedObject.startDate, 'd')) return;

        this.$emit('on-drop', { toDay, target, draggedObject: this.draggedObject });
      } catch (e) {
        console.error(e);
        NotifyNegative('Problème lors de la modification de l\'évènement.');
      } finally {
        this.draggedObject = {};
      }
    },
    openEventCreationModal (event) {
      const isAllowed = this.canEdit({ auxiliaryId: get(event, 'person._id'), sectorId: event.sectorId });
      if (!isAllowed) return NotifyWarning('Vous n\'avez pas les droits pour réaliser cette action.');

      this.$emit('open-creation-modal', event);
    },
    openEventEditionModal (event) {
      this.$emit('open-edition-modal', event);
    },
    canDrag (event) {
      return this.canEdit({ auxiliaryId: get(event, 'auxiliary._id'), sectorId: event.sector });
    },
  },
};
</script>

<style lang="stylus" scoped>
  th:first-child
    @media screen and (min-width: 768px) and (max-width: $breakpoint-sm-max)
      width: 100px;
    @media screen and (min-width: $breakpoint-md-min)
      width: 110px;

  .staffing
    .person
      &-row
        height: auto;
      &-name
        margin: 2px 0 4px;
    td
      position: relative;
      height: 75px;
      z-index: 0;
    .planning-background
      height: 10px;
      margin-top: 2px;
      .line
        width: 1px;
        height: 100%;
        background: $grey-100;
        margin: 0;
        position: absolute;
        z-index: -1;

  .non-staffing
    .planning-background
      @media screen and (max-width: $breakpoint-sm-max)
        padding-bottom: 2rem;
      @media screen and (min-width: $breakpoint-md-min)
        padding-bottom: 1rem;

  .to-assign
    background-color: rgba(253, 243, 229, 0.5);

  .q-page-sticky
    z-index: 20;

thead
  vertical-align: baseline;
</style>
