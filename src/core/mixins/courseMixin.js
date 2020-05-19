import get from 'lodash/get';
import Companies from '@api/Companies';
import { mapGetters } from 'vuex';
import { INTRA, COURSE_TYPES } from '@data/constants';
import { formatIdentity } from '@helpers/utils';

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
    async refreshCompanies () {
      try {
        const companies = await Companies.list();
        this.companyOptions = companies
          .map(c => ({ label: c.tradeName, value: c._id }))
          .sort((a, b) => a.label.localeCompare(b.label));
      } catch (e) {
        console.error(e);
        this.companyOptions = [];
      }
    },
    happened (sameDaySlots) {
      return this.$moment().isSameOrAfter(sameDaySlots[sameDaySlots.length - 1].endDate);
    },
  },
}
