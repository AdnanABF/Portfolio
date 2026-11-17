"use client";

import { ChipsField, Panel, TextAreaField, TextField, ToggleField, UploadField, errorOf, type FieldErrors } from "./fields";
import { LIMITS, type HomepageContent } from "@/lib/homepage";

interface TabProps {
  content: HomepageContent;
  onChange: (next: HomepageContent) => void;
  errors: FieldErrors;
}

/** Name, photo, CV, the big title, the hero buttons, availability, location and time zone, and the core stack. */
export function HeroTab({ content, onChange, errors }: TabProps) {
  const { profile, availability, location } = content;
  const setProfile = (patch: Partial<typeof profile>) => onChange({ ...content, profile: { ...profile, ...patch } });
  const setAvailability = (patch: Partial<typeof availability>) => onChange({ ...content, availability: { ...availability, ...patch } });
  const setLocation = (patch: Partial<typeof location>) => onChange({ ...content, location: { ...location, ...patch } });

  return (
    <div className="space-y-5">
      <Panel title="Photo and CV" description="The photo shows in the hero card. The CV powers the Download CV button; leave it empty to hide the button.">
        <UploadField
          label="Photo"
          value={profile.photoUrl}
          onChange={(photoUrl) => setProfile({ photoUrl })}
          accept="image/*"
          category="photos"
          preview
          error={errorOf(errors, "profile.photoUrl")}
        />
        <TextField label="Photo description" hint="Read aloud by screen readers." value={profile.photoAlt} maxLength={150} onChange={(photoAlt) => setProfile({ photoAlt })} error={errorOf(errors, "profile.photoAlt")} />
        <UploadField
          label="CV file"
          hint="A PDF works best."
          value={profile.cvUrl}
          onChange={(cvUrl) => setProfile({ cvUrl })}
          accept="application/pdf,.pdf"
          category="cv"
          error={errorOf(errors, "profile.cvUrl")}
        />
      </Panel>

      <Panel title="Name and title" description="The name and role also appear in the navigation bar.">
        <TextField label="Name" value={profile.name} maxLength={80} onChange={(name) => setProfile({ name })} error={errorOf(errors, "profile.name")} />
        <TextField label="Role (under the name in the navigation bar)" value={profile.role} maxLength={80} onChange={(role) => setProfile({ role })} error={errorOf(errors, "profile.role")} />
        <TextField label="Greeting tag" hint="The yellow tag next to the photo. Leave empty to hide it." value={profile.greeting} maxLength={80} onChange={(greeting) => setProfile({ greeting })} error={errorOf(errors, "profile.greeting")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Headline" value={profile.headline} maxLength={80} onChange={(headline) => setProfile({ headline })} error={errorOf(errors, "profile.headline")} />
          <TextField label="Headline highlight" hint="Shown in the accent colour after the headline." value={profile.headlineHighlight} maxLength={80} onChange={(headlineHighlight) => setProfile({ headlineHighlight })} error={errorOf(errors, "profile.headlineHighlight")} />
        </div>
        <TextAreaField label="Subtitle" rows={4} maxLength={600} value={profile.subtitle} onChange={(subtitle) => setProfile({ subtitle })} error={errorOf(errors, "profile.subtitle")} />
      </Panel>

      <Panel title="Buttons">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Download CV button text" value={profile.cvButtonLabel} maxLength={40} onChange={(cvButtonLabel) => setProfile({ cvButtonLabel })} error={errorOf(errors, "profile.cvButtonLabel")} />
          <TextField label="Projects button text" hint="Leave empty to hide the button." value={profile.projectsButtonLabel} maxLength={40} onChange={(projectsButtonLabel) => setProfile({ projectsButtonLabel })} error={errorOf(errors, "profile.projectsButtonLabel")} />
        </div>
        <TextField label="Hire me button text (navigation bar)" value={profile.hireMeLabel} maxLength={30} onChange={(hireMeLabel) => setProfile({ hireMeLabel })} error={errorOf(errors, "profile.hireMeLabel")} />
      </Panel>

      <Panel title="Availability" description="The green badge in the hero area.">
        <ToggleField label="Show availability" checked={availability.enabled} onChange={(enabled) => setAvailability({ enabled })} />
        <TextField label="Label" value={availability.label} maxLength={60} onChange={(label) => setAvailability({ label })} error={errorOf(errors, "availability.label")} />
        <TextAreaField label="Text" rows={2} maxLength={300} value={availability.text} onChange={(text) => setAvailability({ text })} error={errorOf(errors, "availability.text")} />
      </Panel>

      <Panel title="Location and time zone" description="Leave all three empty to hide the card. The address is also used in the Contact section and on the resume page.">
        <TextField label="Heading" value={location.title} maxLength={80} onChange={(title) => setLocation({ title })} error={errorOf(errors, "location.title")} />
        <TextField label="Address" value={location.address} maxLength={200} onChange={(address) => setLocation({ address })} error={errorOf(errors, "location.address")} />
        <TextField label="Time zone" hint='For example "AST (UTC+3)".' value={location.timeZone} maxLength={60} onChange={(timeZone) => setLocation({ timeZone })} error={errorOf(errors, "location.timeZone")} />
      </Panel>

      <Panel title="Core stack" description="The short list of chips in the hero area.">
        <ChipsField label="Items" values={content.coreStack} max={LIMITS.coreStack} onChange={(coreStack) => onChange({ ...content, coreStack })} error={errorOf(errors, "coreStack")} />
      </Panel>
    </div>
  );
}
