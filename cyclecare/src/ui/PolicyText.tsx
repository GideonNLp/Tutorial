import { content } from '../content';

/** The privacy statement, rendered from the same source as docs/05-…md. */
export function PolicyText() {
  const { privacyPolicy } = content().legal;
  return (
    <div className="stack stack-5 policy">
      <p className="notice">{privacyPolicy.draftNotice}</p>
      {privacyPolicy.sections.map((section) => (
        <section key={section.heading} className="stack stack-2">
          <h3>{section.heading}</h3>
          {section.paragraphs?.slice(0, section.bullets ? 1 : undefined).map((p) => <p key={p}>{p}</p>)}
          {section.bullets && (
            <ul className="bullets">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {section.bullets && section.paragraphs?.slice(1).map((p) => <p key={p}>{p}</p>)}
        </section>
      ))}
    </div>
  );
}
