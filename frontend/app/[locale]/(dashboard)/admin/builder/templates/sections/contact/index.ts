import { contactFormPlusInfo } from "./form-plus-info";
import { contactMapEmbedSplit } from "./map-embed-split";
import { contactMultiOffice } from "./multi-office";
import { contactInlineMinimal } from "./inline-minimal";
import { contactDepartmentTabs } from "./department-tabs";
import { contactFullWidthForm } from "./full-width-form";
import { contactAppointmentScheduler } from "./appointment-scheduler";
import { contactLiveChatCta } from "./live-chat-cta";
import { contactFaqPlusContact } from "./faq-plus-contact";
import { contactSocialFirst } from "./social-first";

export const contactTemplates = [
  contactFormPlusInfo,
  contactMapEmbedSplit,
  contactMultiOffice,
  contactInlineMinimal,
  contactDepartmentTabs,
  contactFullWidthForm,
  contactAppointmentScheduler,
  contactLiveChatCta,
  contactFaqPlusContact,
  contactSocialFirst,
] as const;

export {
  contactFormPlusInfo,
  contactMapEmbedSplit,
  contactMultiOffice,
  contactInlineMinimal,
  contactDepartmentTabs,
  contactFullWidthForm,
  contactAppointmentScheduler,
  contactLiveChatCta,
  contactFaqPlusContact,
  contactSocialFirst,
};
