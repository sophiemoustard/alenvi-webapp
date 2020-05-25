import get from 'lodash/get';
import set from 'lodash/set';
import { mapGetters } from 'vuex';
import Courses from '@api/Courses';
import { INTRA, COURSE_TYPES } from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const courseMixin = {
  computed: {
    ...mapGetters({ vendorRole: 'main/vendorRole' }),
    companyName () {
      return get(this.course, 'company.tradeName') || '';
    },
    programName () {
      return get(this.course, 'program.name') || '';
    },
    isIntraCourse () {
      return get(this.course, 'type') === INTRA;
    },
    courseType () {
      const type = COURSE_TYPES.find(t => t.value === get(this.course, 'type'));
      return type ? type.label : '';
    },
    headerInfo () {
      const infos = [
        { icon: 'library_books', label: this.programName },
        { icon: 'bookmark_border', label: this.courseType },
        { icon: 'emoji_people', label: this.trainerName },
      ]
      if (this.isIntraCourse) infos.push({ icon: 'apartment', label: this.companyName });

      return infos;
    },
    trainerName () {
      return formatIdentity(get(this.course, 'trainer.identity'), 'FL');
    },
  },
  methods: {
    happened (sameDaySlots) {
      return this.$moment().isSameOrAfter(sameDaySlots[sameDaySlots.length - 1].endDate);
    },
    saveTmp (path) {
      this.tmpInput = path === 'trainer' ? get(this.course, 'trainer._id', '') : get(this.course, path);
    },
    async updateCourse (path) {
      try {
        const value = path === 'trainer' ? get(this.course, 'trainer._id', '') : get(this.course, path);
        if (this.tmpInput === value) return;
        get(this.$v.course, path).$touch();
        if (get(this.$v.course, path).$error) return NotifyWarning('Champ(s) invalide(s).');

        const payload = set({}, path, value);
        await Courses.update(this.profileId, payload);
        NotifyPositive('Modification enregistrée.');

        await this.refreshCourse();
      } catch (e) {
        console.error(e);
        if (e.message === 'Champ(s) invalide(s)') return NotifyWarning(e.message)
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        this.tmpInput = null;
      }
    },
  },
}
