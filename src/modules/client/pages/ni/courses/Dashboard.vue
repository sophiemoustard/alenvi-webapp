<template>
  <q-page class="client-background" padding>
    <ni-title-header title="La formation Compani dans ma structure" />
    <div class="flex justify-between q-mt-xl">
      <p class="text-weight-bold section-title">Chiffres généraux</p>
      <ni-date-range v-model="dates" class="dates" borders />
    </div>
    <q-card flat class="q-pa-md row">
      <div class="text-weight-bold q-mb-sm col-md-4 col-xs-12 text-copper-grey-700">Le eLearning dans ma structure</div>
      <div class="row justify-around col-md-8 col-xs-12">
        <div class="column items-center">
          <ni-e-learning-indicator :indicator="activeLearners" />
          <div class="text-center">apprenants actifs</div>
        </div>
        <div class="column items-center">
          <ni-e-learning-indicator :indicator="activityHistories.length" />
          <div class="text-center">activités de eLearning réalisées</div>
        </div>
      </div>
    </q-card>
    <div class="row q-mt-md">
      <div class="col-xs-12 col-md-6 left-card">
        <q-card flat class="fit q-pa-md">
          <div class="text-weight-bold q-mb-sm text-copper-grey-700">Apprenants les plus assidus</div>
          <div class="row justify-end">
            <div class="col-4 text-copper-grey-500 text-center">Activités eLearning réalisées</div>
          </div>
          <div v-for="(learner, index) in learnerList.slice(0, 5)" :key="learner._id"
            class="justify-between items-center row q-my-sm">
            <div class="flex no-wrap items-center col-8">
              <ni-e-learning-indicator :indicator="index + 1" />
              <img class="q-mx-md avatar" :src="learner.picture ? learner.picture.link : DEFAULT_AVATAR">
              <div class="text-copper-grey-800">{{ formatIdentity(learner.identity, 'FL') }}</div>
            </div>
            <div class="col-4 text-center">{{ learner.activityCount }}</div>
          </div>
        </q-card>
      </div>
      <div class="col-xs-12 col-md-6 right-card">
        <q-card flat class="fit q-pa-md">
          <div class="text-weight-bold q-mb-sm text-copper-grey-700">Formations les plus suivies</div>
          <div class="row justify-end">
            <div class="col-4 text-copper-grey-500 text-center">Nombre d'apprenants actifs</div>
          </div>
          <div v-for="(course, index) in courseList.slice(0, 5)" :key="course.name"
            class="justify-between items-center row q-my-sm">
            <div class="flex no-wrap items-center col-8">
              <ni-e-learning-indicator :indicator="index + 1" />
              <div class="q-mx-md text-copper-grey-800">{{ upperCaseFirstLetter(course.name) }}</div>
            </div>
            <div class="col-4 text-center">{{ course.activeTraineesCount }}</div>
          </div>
        </q-card>
      </div>
    </div>
    <div class="q-mt-xl">
      <p class="text-weight-bold section-title">Evolution dans le temps</p>
      <div class="row">
        <ni-line-chart title="Apprenants actifs mensuels" :chart-data="chartData(this.traineesByMonth)"
          class="col-xs-12 col-md-6 q-mt-sm line-chart-container" />
        <ni-line-chart title="Nombre total d'activités réalisées par mois"
          :chart-data="chartData(this.activitiesByMonth)" class="col-xs-12 col-md-6 q-mt-sm line-chart-container" />
      </div>
    </div>
  </q-page>
</template>

<script>
import omit from 'lodash/omit';
import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import ActivityHistories from '@api/ActivityHistories';
import TitleHeader from '@components/TitleHeader';
import DateRange from '@components/form/DateRange';
import { NotifyNegative, NotifyPositive } from '@components/popup/notify';
import ELearningIndicator from '@components/courses/ELearningIndicator';
import LineChart from '@components/charts/LineChart';
import { DEFAULT_AVATAR } from '@data/constants';
import moment from '@helpers/moment';
import { formatIdentity, upperCaseFirstLetter } from '@helpers/utils';
import { chartMixin } from '@mixins/chartMixin';

export default {
  name: 'CourseDashboard',
  metaInfo: { title: 'Tableau de bord des formations' },
  mixins: [chartMixin],
  components: {
    'ni-title-header': TitleHeader,
    'ni-date-range': DateRange,
    'ni-e-learning-indicator': ELearningIndicator,
    'ni-line-chart': LineChart,
  },
  data () {
    return {
      dates: {
        startDate: moment().subtract(30, 'd').startOf('d').toISOString(),
        endDate: moment().toISOString(),
      },
      activityHistories: [],
      formatIdentity,
      upperCaseFirstLetter,
      DEFAULT_AVATAR,
    };
  },
  computed: {
    activeLearners () {
      return uniqBy(this.activityHistories, 'user._id').length;
    },
    courseList () {
      const groupedByCourses = Object.values(groupBy(this.activityHistories.map((aH) => {
        const res = [];
        for (const step of aH.activity.steps) res.push({ ...aH, activity: { ...omit(aH.activity, 'steps'), step } });
        return res;
      }).flat(), h => get(h, 'activity.step.subProgram.courses[0]._id')));

      return groupedByCourses.map(group => ({
        name: get(group[0], 'activity.step.subProgram.program.name'),
        activeTraineesCount: new Set(group.map(a => a.user._id)).size,
      })).sort((a, b) => b.activeTraineesCount - a.activeTraineesCount);
    },
    learnerList () {
      const groupedByLearners = Object.values(groupBy(this.activityHistories, h => h.user._id));

      return groupedByLearners.map(group => ({ ...group[0].user, activityCount: group.length }))
        .sort((a, b) => b.activityCount - a.activityCount);
    },
  },
  watch: {
    async dates () {
      await this.getActivityHistories();
    },
  },
  async created () {
    await this.getActivityHistories();
    await this.computeChartsData();
  },
  methods: {
    async getActivityHistories () {
      try {
        if (!this.dates.startDate || moment(this.dates.startDate).isAfter(this.dates.endDate)) return;
        const { endDate } = this.dates;
        this.activityHistories = await ActivityHistories.list({
          ...this.dates,
          endDate: moment(endDate).endOf('d').toISOString(),
        });
        NotifyPositive('Données mises à jour.');
      } catch (e) {
        this.activityHistories = [];
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des données.');
      }
    },
    async computeChartsData () {
      try {
        const chartStartDate = new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1);
        const chartEndDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const sixMonthsHistories = await ActivityHistories.list({ startDate: chartStartDate, endDate: chartEndDate });

        this.traineesByMonth = this.getDataByMonth(sixMonthsHistories, 'user._id');
        this.activitiesByMonth = this.getDataByMonth(sixMonthsHistories);
        NotifyPositive('Données mises à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des données.');
      }
    },
  },
};
</script>

<style lang="stylus" scoped>
.left-card
  @media screen and (min-width: $breakpoint-md-min)
    padding-right: 16px
  @media screen and (max-width: $breakpoint-sm-max)
    padding-bottom: 16px

.rigth-card
  @media screen and (min-width: $breakpoint-md-min)
    padding-left: 16px
  @media screen and (max-width: $breakpoint-sm-max)
    padding-top: 16px

.line-chart-container
  @media screen and (min-width: $breakpoint-sm-max)
    padding-right: 16px;

.section-title
  font-size: 24px;
  color: $copper-grey-900
</style>
