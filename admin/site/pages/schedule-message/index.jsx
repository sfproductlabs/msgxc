import Markdown from '../../../libs/markdown';

import './style.scss';

export default class ScheduleMessage extends Markdown {
  document(locale) {
    return require(`../../docs/${locale}/schedule-message.md`);
  }
}
