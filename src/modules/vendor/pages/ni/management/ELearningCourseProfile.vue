<template>
    <q-page class="vendor-background" padding>
      <ni-profile-header :title="courseName" />
      <profile-tabs :profile-id="courseId" :tabs-content="tabsContent" />
    </q-page>
</template>

<script>
import { mapState } from 'vuex';
import get from 'lodash/get';
import ProfileHeader from '@components/ProfileHeader';
import ProfileTabs from '@components/ProfileTabs';
import ProfileFollowUp from '@components/courses/ProfileFollowUp';
import ProfileAccess from 'src/modules/vendor/components/courses/ProfileAccess';
import ProfileQuestionnaires from 'src/modules/vendor/components/courses/ProfileQuestionnaires';
import { NotifyNegative } from '@components/popup/notify';

export default {
  name: 'ELearningCoursesProfile',
  components: {
    'ni-profile-header': ProfileHeader,
    'profile-tabs': ProfileTabs,
  },
  props: {
    courseId: { type: String, required: true },
    defaultTab: { type: String, default: 'followUp' },
  },
  computed: {
    ...mapState('course', ['course']),
    courseName () {
      return get(this.course, 'subProgram.program.name');
    },
  },
  data () {
    return {
      tabsContent: [
        { label: 'Suivi', name: 'followUp', default: this.defaultTab === 'followUp', component: ProfileFollowUp },
        {
          label: 'Questionnaires',
          name: 'questionnaires',
          default: this.defaultTab === 'questionnaires',
          component: ProfileQuestionnaires,
        },
        { label: 'Accès', name: 'access', default: this.defaultTab === 'access', component: ProfileAccess },
      ],
    };
  },
  async created () {
    await this.refreshCourse();
  },
  methods: {
    async refreshCourse () {
      try {
        await this.$store.dispatch('course/fetchCourse', { courseId: this.courseId });
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération de la formation.');
      }
    },
  },
  beforeDestroy () {
    this.$store.dispatch('course/resetCourse');
  },
};
</script>
