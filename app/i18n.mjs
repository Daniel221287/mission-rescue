// All interface texts in Polish and English. Used by the page and by the command line.
// spec.md > Command Center Screen · prd.md > Polish Command Center

export const LANGS = ['pl', 'en'];

const EVENT_NAMES = {
  pl: { started: 'start zadania', progress: 'postęp', done: 'zgłoszenie wykonania', waiting: 'czekam', error: 'błąd', heartbeat: 'sygnał „żyję”', note: 'notatka' },
  en: { started: 'task started', progress: 'progress', done: 'reported done', waiting: 'waiting', error: 'error', heartbeat: 'heartbeat', note: 'note' },
};

const D = {
  pl: {
    'app.subtitle': 'Prawda o pracy agentów AI',
    'app.tagline': 'Misja od A do Z. Zielone tylko z dowodem.',
    'lang.switch': 'EN',
    'lang.switch.label': 'Switch to English',
    'lang.name': 'Polski',
    'nav.back': '← Wszystkie misje',
    'btn.recheck': 'Sprawdź ponownie',
    'btn.copy': 'Kopiuj instrukcję',
    'btn.copied': 'Skopiowano',
    'btn.copy-failed': 'Zaznaczyłem tekst: skopiuj go ręcznie',
    'btn.run-agent': 'Uruchom przykładowego agenta',
    'btn.running-agent': 'Agent pracuje…',
    'btn.honesty': 'Test uczciwości: po cichu zmień sumę w zadaniu 3',
    'btn.reset-samples': 'Przywróć przykład',
    'btn.confirm-effect': 'Potwierdzam: sprawdziłem i to się stało',
    'btn.unconfirm-effect': 'Cofnij potwierdzenie',
    'btn.cancel': 'Anuluj',
    'btn.pick-again': 'Wybierz inny folder',
    'btn.add-limit': 'Dodaj limit ręcznie',
    'btn.save': 'Zapisz',
    'btn.remove': 'Usuń',
    'btn.pick-folder': 'Wybierz folder z misjami',
    'src.label': 'Skąd czytać misje',
    'src.samples': 'Przykładowe misje',
    'src.local': 'Ten komputer',
    'src.folder': 'Wybrany folder',
    'src.samples.note': 'Wbudowane przykłady z fikcyjnymi danymi. Wszystko liczy się tu, w Twojej przeglądarce.',
    'src.local.note': 'Folder misji na tym komputerze, czytany przez lokalny program (tylko do odczytu).',
    'src.local.unavailable': 'Źródło „Ten komputer” działa po uruchomieniu START.cmd albo „node tools/server.mjs” (README).',
    'src.folder.note': 'Pliki czyta Twoja przeglądarka. Nic nie jest wysyłane.',
    'src.folder.unsupported': 'Ta przeglądarka nie umie wybrać folderu. Użyj Chrome albo Edge na komputerze.',
    'src.folder.picked': 'Folder: {name}. Pliki czyta Twoja przeglądarka, tylko do odczytu. Nic nie jest wysyłane.',
    'src.folder.snapshot': 'Ta przeglądarka dała kopię plików z chwili wyboru. Żeby zobaczyć zmiany, wybierz folder jeszcze raz.',
    'src.folder.none': 'Wybierz folder z misjami (albo folder jednej misji). Pliki czyta Twoja przeglądarka. Nic nie jest wysyłane.',
    'list.title': 'Misje',
    'list.empty': 'Nie znalazłem tu żadnej misji. Misja to folder z plikiem mission.json i logiem worklog.jsonl.',
    'list.open': 'Otwórz',
    'mission.proven': '{proven} z {total} potwierdzone',
    'mission.agent': 'Agent: {agent}',
    'mission.plan': 'Plan: {plan}',
    'mission.checked': 'Sprawdzone {at}',
    'mission.demo-badge': 'Przykład z fikcyjnymi danymi',
    'list.count': '{n}',
    'list.folder': 'Folder {dir}',
    'section.what': 'Co się stało',
    'section.todo': 'Co zrobić',
    'section.facts': 'Na czym opieram diagnozę',
    'section.tasks': 'Zadania i dowody',
    'section.rescue': 'Plan ratunkowy',
    'section.limits': 'Limity',
    'section.log': 'Ostatnie wpisy w logu',
    'section.problems': 'Problemy z plikami',
    'section.demo': 'Pokaz',
    'conf.label': 'Pewność diagnozy',
    'conf.high': 'wysoka',
    'conf.medium': 'średnia',
    'conf.low': 'niska',
    'verdict.complete': 'Misja zakończona i potwierdzona dowodami',
    'verdict.proof-problem': 'Problem z dowodem',
    'verdict.likely-failure': 'Prawdopodobna awaria',
    'verdict.no-progress': 'Brak postępu',
    'verdict.waiting-limit': 'Czeka na limit',
    'verdict.waiting-human': 'Czeka na Ciebie',
    'verdict.working': 'Pracuje',
    'verdict.undetermined': 'Stan nieustalony',
    'verdict.not-started': 'Nie rozpoczęta',
    'verdict.unreadable': 'Nie mogę przeczytać misji',
    'verdict.needs-confirmation': 'Czeka na Twoje potwierdzenie',
    'todo.complete': 'Nic. Każde zadanie ma sprawdzony dowód.',
    'todo.proof-problem': 'Nie przyjmuj tej pracy. Przekaż agentowi plan ratunkowy: najpierw sprawdzić skutki, potem poprawić wynik i zgłosić go z nowym odciskiem.',
    'todo.likely-failure': 'Przekaż agentowi plan ratunkowy poniżej. Zadań z dowodem nie powtarzaj.',
    'todo.no-progress': 'Zapytaj agenta, na czym utknął, albo przekaż plan ratunkowy. Sygnały „żyję” to nie postęp.',
    'todo.waiting-limit': 'Poczekaj do odnowienia limitu i sprawdź ponownie. Jeśli agent nie wróci, użyj planu ratunkowego.',
    'todo.waiting-human': 'Odpowiedz agentowi na pytanie, potem sprawdź ponownie.',
    'todo.working': 'Daj mu pracować i sprawdź ponownie za chwilę.',
    'todo.undetermined': 'Sprawdź ponownie za kilka minut albo zapytaj agenta, czy dalej pracuje. Plan ratunkowy jest gotowy na wszelki wypadek.',
    'todo.not-started': 'Uruchom agenta albo przekaż mu instrukcję startową.',
    'todo.unreadable': 'Popraw plik misji (szczegóły niżej) i sprawdź ponownie.',
    'todo.needs-confirmation': 'Sprawdź sam, czy efekt naprawdę nastąpił, i potwierdź go w planie poniżej. Bez Twojego potwierdzenia misja nie będzie zielona.',
    'reason.all-proven': 'Wszystkie zadania ({total}) mają sprawdzony dowód.',
    'reason.proof-failed': 'Agent zgłosił zadanie {task} jako zrobione, ale dowód nie przechodzi: {stateText}.',
    'reason.no-events': 'Log pracy jest pusty: agent jeszcze nic nie zgłosił.',
    'reason.no-readable-log.files': 'W logu pracy nie ma żadnego czytelnego wpisu, ale pliki wyników już istnieją (zadania: {tasks}). Sprawdź je, zanim uruchomisz agenta, żeby nic nie zrobił drugi raz.',
    'reason.no-readable-log.broken': 'Żadnej linii logu pracy nie da się odczytać (szczegóły niżej). Popraw log, zanim uruchomisz agenta.',
    'reason.future-time': 'Ostatni wpis w logu ma czas o {ahead} późniejszy niż zegar tego komputera. Agent pewnie zapisuje czas w złej strefie, więc nie da się ocenić, jak długo milczy.',
    'reason.error-reported': 'Agent zgłosił błąd w zadaniu {task}: „{message}”',
    'reason.error-reported.no-task': 'Agent zgłosił błąd: „{message}”',
    'reason.limit-back-agent-not': 'Limit odnowił się {until}, a agent od tego czasu nie wrócił do pracy.',
    'reason.silence.partial': 'Zadanie {task} się zaczęło, jego plik wyniku jest niedokończony, a od {silence} jest cisza. Agent nie napisał, na co czeka.',
    'reason.silence.plain': 'Od {silence} jest cisza w trakcie zadania {task}, bez podanego powodu.',
    'reason.question': 'Agent czeka na Twoją odpowiedź: „{question}”',
    'reason.agent-said-limit.yes': 'Agent napisał, że czeka na limit, a dane o limitach to potwierdzają. Odnowienie: {until}.',
    'reason.agent-said-limit.no': 'Agent napisał, że czeka na limit. Odnowienie: {until}.',
    'reason.inferred-from-limits': 'Agent nic nie napisał, ale limit {plan} ({window}) jest wykorzystany w {used}% do {until}. Najpewniej czeka na limit.',
    'reason.waiting-other': 'Agent napisał, że czeka: „{message}”',
    'reason.signs-of-life-only': 'Agent daje znaki życia ({beats} wpisów), ale od {since} nie dowiózł żadnego wyniku z dowodem.',
    'reason.short-silence': 'Cisza trwa {silence}, dłużej niż oczekiwane {wait}, ale za krótko, żeby uznać to za awarię. Zadanie może po prostu dłużej trwać.',
    'reason.recent-progress': 'Ostatni postęp był niedawno ({at}).',
    'reason.recent-activity': 'Agent był aktywny niedawno ({at}).',
    'reason.unreadable': 'Pliku {file} brakuje albo jest uszkodzony.',
    'reason.unreadable.detail': 'Nie mogę odczytać pliku misji: {detail}.',
    'reason.confirm-effects': 'Agent dowiózł wyniki ze sprawdzonymi plikami. {taskHas} skutek poza komputerem, do sprawdzenia w {where}. Tego żaden plik nie udowodni: musi to potwierdzić człowiek.',
    'reason.task-has.one': 'Zadanie {tasks} ma',
    'reason.task-has.many': 'Zadania {tasks} mają',
    'fact.last-proven': 'Ostatni wynik z dowodem: zadanie {task}, {at}',
    'fact.nothing-proven': 'Żadne zadanie nie ma jeszcze dowodu',
    'fact.last-signal': 'Ostatni sygnał: {eventText}{taskPart}, {at}',
    'fact.silence': 'Cisza od: {ms}',
    'fact.waiting-time': 'Próg ciszy dla tego zadania: {ms} (próg misji)',
    'fact.waiting-time.expected': 'Próg ciszy dla tego zadania: {ms} (dłuższy z dwóch: próg misji {minimum} min albo 1,5 × {expected} min przewidzianych na zadanie)',
    'fact.partial-file': 'Plik zadania {task} istnieje, ale jest niedokończony: {file}',
    'fact.limit': 'Limit {plan} {window}: {used}%, odnowienie {until} ({labelText})',
    'fact.limit-unknown': 'Brak aktualnych danych o limicie planu {plan}',
    'fact.proven-count': '{proven} z {total} zadań z dowodem',
    'fact.proof-state': 'Zadanie {task}: {stateText} ({file})',
    'fact.effect-where': 'Zadanie {task}: skutek do sprawdzenia w {where}',
    'task.part': ' (zadanie {task})',
    'state.proven': 'Potwierdzone',
    'state.effect-unconfirmed': 'Efekt zewnętrzny niepotwierdzony',
    'state.declared-no-artifact-info': 'Zgłoszone bez dowodu',
    'state.undeclared-result': 'Efekt niepewny: wynik jest, ale nie zgłoszony',
    'state.in-progress': 'W toku',
    'state.artifact-missing': 'Brak pliku wyniku',
    'state.hash-mismatch': 'Odcisk się nie zgadza',
    'state.wrong-result': 'Wynik nieprawidłowy',
    'state.wrong-file': 'Zgłoszony inny plik niż wymaga misja',
    'state.failed': 'Błąd',
    'state.not-started': 'Nie rozpoczęte',
    'level.declared': 'Zgłoszone',
    'level.exists': 'Plik istnieje',
    'level.verified': 'Zweryfikowany',
    'level.effect': 'Efekt zewnętrzny',
    'level.na': 'nie dotyczy',
    'level.partial': 'bez danych pliku',
    'detail.file': 'Plik wyniku',
    'detail.condition': 'Warunek',
    'detail.declared-sha': 'Odcisk zgłoszony',
    'detail.actual-sha': 'Odcisk policzony',
    'detail.none': 'brak',
    'detail.where': 'Sprawdź efekt w',
    'detail.confirmed-by-human': 'Potwierdzone przez człowieka {at}',
    'confirm.note': 'Potwierdzaj tylko to, co widzisz na własne oczy. Potwierdzenie dotyczy dokładnie tej wersji pliku (odcisk {sha}…) i jest zapisane tylko w tej przeglądarce.',
    'confirm.where': 'Sprawdź w {where}.',
    'check.contains': 'zawiera „{text}”',
    'check.json': '{path} = {expected}',
    'check.nonEmpty': 'nie jest pusty',
    'checkfail.text-missing': 'brak tekstu „{text}”',
    'checkfail.value-differs': '{path} = {actual}, a powinno być {expected}',
    'checkfail.invalid-json': 'plik nie jest poprawnym JSON-em',
    'checkfail.empty': 'plik jest pusty',
    'problem.missing': 'Brak pliku {file}',
    'problem.invalid-json': '{file}{linePart}: niepoprawny JSON',
    'problem.not-an-object': '{file}{linePart}: to nie jest obiekt JSON',
    'problem.unknown-format': '{file}: nieznany format „{found}” (oczekiwany mission-rescue/1)',
    'problem.bad-title': '{file}: brak tytułu misji',
    'problem.no-tasks': '{file}: brak listy zadań',
    'problem.bad-task': '{file}: zadanie {task} jest uszkodzone',
    'problem.bad-task-id': '{file}: zadanie {task} ma zły numer',
    'problem.duplicate-task-id': '{file}: numer zadania {task} się powtarza',
    'problem.bad-task-title': '{file}: zadanie {task} nie ma tytułu',
    'problem.bad-artifact': '{file}: zadanie {task} ma złą ścieżkę pliku wyniku',
    'problem.bad-check': '{file}: zadanie {task} ma zły warunek',
    'problem.bad-effect': '{file}: zadanie {task} ma zły opis efektu zewnętrznego',
    'problem.bad-time': '{file}{linePart}: zły czas „at”',
    'problem.time-without-zone': '{file}{linePart}: czas „at” bez strefy czasowej (takich linii: {count}); liczony w czasie tego komputera',
    'problem.unknown-event': '{file}{linePart}: nieznane zdarzenie „{found}”',
    'problem.unknown-task': '{file}{linePart}: nieznane zadanie {found}',
    'problem.missing-task': '{file}{linePart}: brak numeru zadania',
    'problem.unknown-source': '{file}: nieznane źródło limitów',
    'problem.bad-plan': '{file}: uszkodzony wpis limitu',
    'problem.line': ', linia {line}',
    'limit.demo': 'DEMO',
    'limit.manual': 'RĘCZNE',
    'limit.auto-verified': 'ZWERYFIKOWANE AUTOMATYCZNIE',
    'limit.stale': 'NIEAKTUALNE',
    'limit.stale.reset-passed': 'odnowienie już minęło',
    'limit.stale.old-capture': 'odczyt sprzed {age}',
    'limit.captured': 'odczyt {at}',
    'limit.resets': 'odnowienie {at}',
    'limit.empty': 'Brak danych o limitach. Dodaj je ręcznie albo podłącz pasek stanu Claude Code (README).',
    'limit.form.plan': 'Plan',
    'limit.form.window': 'Okno',
    'limit.form.used': 'Zużycie %',
    'limit.form.reset': 'Odnowienie',
    'limit.note': 'Mission Rescue nigdy nie loguje się do czatów, żeby czytać limity.',
    'limit.form.title': 'Limit wpisany ręcznie',
    'limit.form.window.other': 'inne',
    'limit.form.hint': 'Przepisz liczby z ekranu limitów swojej usługi. Zapisują się tylko w tej przeglądarce i mają etykietę RĘCZNE.',
    'limit.form.error': 'Podaj nazwę planu i zużycie od 0 do 100%.',
    'limit.manual.remove': 'Usuń ręczny wpis {plan} {window}',
    'demo.agent.note': 'Przykładowy agent naprawdę liczy wyniki zadań z fikcyjnych danych i zapisuje je z odciskami SHA-256.',
    'demo.honesty.note': 'Test uczciwości po cichu zmienia sumę jednego dnia w potwierdzonym pliku. Warunek nadal przechodzi, więc złapać to może tylko odcisk SHA-256.',
    'demo.reset.note': 'Przywraca przykłady do stanu początkowego (czasy liczone od teraz).',
    'demo.agent.step.check': 'Zadanie {task}: sprawdzam skutki przed ponowieniem…',
    'demo.agent.step.reuse': 'Zadanie {task}: wynik już jest i przechodzi warunek, zgłaszam go bez powtarzania.',
    'demo.agent.step.redo': 'Zadanie {task}: wynik niepełny, wykonuję od nowa.',
    'demo.agent.step.changed': 'Zadanie {task}: plik zmienił się po zgłoszeniu albo ma zły wynik, wykonuję od nowa.',
    'demo.agent.step.do': 'Zadanie {task}: wykonuję.',
    'demo.agent.step.done': 'Zadanie {task}: gotowe, zapisane z odciskiem.',
    'demo.agent.finished': 'Przykładowy agent skończył. Naciśnij „Sprawdź ponownie”.',
    'demo.agent.finished.cli': 'Przykładowy agent skończył. Uruchom teraz „check”, żeby sprawdzić wyniki.',
    'rescue.checkpoint': 'Ostatni potwierdzony punkt',
    'rescue.checkpoint.task': 'zadanie {task}',
    'rescue.checkpoint.none': 'brak',
    'rescue.remaining': 'Pozostałe zadania',
    'rescue.steps': 'Co zrobić z każdym zadaniem',
    'rescue.instruction': 'Instrukcja wznowienia dla agenta',
    'rescue.handover': 'Przekaż ją agentowi sam. Mission Rescue niczego nie uruchamia.',
    'rescue.action.check-first': 'Najpierw sprawdź, czy już się wykonało',
    'rescue.action.redo': 'Sprawdź, co zmieniło plik, i wykonaj ponownie',
    'rescue.action.do': 'Zrób',
    'rescue.action.confirm': 'Potwierdź (człowiek)',
    'rescue.check': 'Sprawdzenie: {file} {condition}',
    'rescue.not-needed': 'Plan nie jest potrzebny: wszystko ma dowody.',
    'rescue.confirm-only': 'Agent skończył swoją część. Zostało potwierdzenie przez człowieka.',
    'demo.honesty.done': 'Zmieniłem po cichu sumę jednego dnia w pliku zadania 3. Naciśnij „Sprawdź ponownie”.',
    'demo.local.note': 'Na tym komputerze przykładowego agenta uruchamiasz poleceniem:',
    'demo.local.honesty': 'Test uczciwości na dysku:',
    'demo.local.reset': 'Przywrócenie przykładu na dysku:',
    'log.empty': 'Log jest pusty.',
    'footer.privacy': 'Mission Rescue czyta pliki na Twoim urządzeniu. Niczego nie wysyła i niczego nie zmienia w misjach.',
    'footer.source': 'Kod źródłowy na GitHubie (licencja MIT)',
    'time.just-now': 'przed chwilą',
    'time.ago': '{d} temu',
    'time.in': 'za {d}',
  },
  en: {
    'app.subtitle': "The truth about AI agents' work",
    'app.tagline': 'A mission from A to Z. Green only with proof.',
    'lang.switch': 'PL',
    'lang.switch.label': 'Przełącz na polski',
    'lang.name': 'English',
    'nav.back': '← All missions',
    'btn.recheck': 'Check again',
    'btn.copy': 'Copy the instruction',
    'btn.copied': 'Copied',
    'btn.copy-failed': 'Text selected: copy it by hand',
    'btn.run-agent': 'Run the sample agent',
    'btn.running-agent': 'The agent is working…',
    'btn.honesty': 'Honesty test: silently change a total in task 3',
    'btn.reset-samples': 'Restore the sample',
    'btn.confirm-effect': 'I confirm: I checked and it happened',
    'btn.unconfirm-effect': 'Withdraw the confirmation',
    'btn.cancel': 'Cancel',
    'btn.pick-again': 'Pick another folder',
    'btn.add-limit': 'Add a limit by hand',
    'btn.save': 'Save',
    'btn.remove': 'Remove',
    'btn.pick-folder': 'Pick a missions folder',
    'src.label': 'Where to read missions from',
    'src.samples': 'Sample missions',
    'src.local': 'This computer',
    'src.folder': 'Picked folder',
    'src.samples.note': 'Built-in samples with fictional data. Everything is computed here, in your browser.',
    'src.local.note': 'The missions folder on this computer, read by the local program (read-only).',
    'src.local.unavailable': '"This computer" works after you start START.cmd or "node tools/server.mjs" (see the README).',
    'src.folder.note': 'Your browser reads the files. Nothing is uploaded.',
    'src.folder.unsupported': 'This browser cannot pick a folder. Use Chrome or Edge on a computer.',
    'src.folder.picked': 'Folder: {name}. Your browser reads the files, read-only. Nothing is uploaded.',
    'src.folder.snapshot': 'This browser gave a copy of the files from the moment you picked them. To see changes, pick the folder again.',
    'src.folder.none': 'Pick a folder with missions (or one mission folder). Your browser reads the files. Nothing is uploaded.',
    'list.title': 'Missions',
    'list.empty': 'No mission found here. A mission is a folder with mission.json and worklog.jsonl.',
    'list.open': 'Open',
    'mission.proven': '{proven} of {total} proven',
    'mission.agent': 'Agent: {agent}',
    'mission.plan': 'Plan: {plan}',
    'mission.checked': 'Checked {at}',
    'mission.demo-badge': 'Sample with fictional data',
    'list.count': '{n}',
    'list.folder': 'Folder {dir}',
    'section.what': 'What happened',
    'section.todo': 'What to do',
    'section.facts': 'What the diagnosis is based on',
    'section.tasks': 'Tasks and proofs',
    'section.rescue': 'Rescue plan',
    'section.limits': 'Limits',
    'section.log': 'Latest work-log entries',
    'section.problems': 'File problems',
    'section.demo': 'Demo',
    'conf.label': 'Diagnosis confidence',
    'conf.high': 'high',
    'conf.medium': 'medium',
    'conf.low': 'low',
    'verdict.complete': 'Mission complete and proven',
    'verdict.proof-problem': 'Proof problem',
    'verdict.likely-failure': 'Likely failure',
    'verdict.no-progress': 'No progress',
    'verdict.waiting-limit': 'Waiting for a limit',
    'verdict.waiting-human': 'Waiting for you',
    'verdict.working': 'Working',
    'verdict.undetermined': 'Undetermined',
    'verdict.not-started': 'Not started',
    'verdict.unreadable': 'Cannot read the mission',
    'verdict.needs-confirmation': 'Waiting for your confirmation',
    'todo.complete': 'Nothing. Every task has a verified proof.',
    'todo.proof-problem': 'Do not accept this work. Give the agent the rescue plan: check the effects first, then fix the result and report it with a new fingerprint.',
    'todo.likely-failure': 'Give the agent the rescue plan below. Do not repeat tasks that are proven.',
    'todo.no-progress': 'Ask the agent where it is stuck, or give it the rescue plan. Heartbeats are not progress.',
    'todo.waiting-limit': 'Wait for the limit to reset and check again. If the agent does not come back, use the rescue plan.',
    'todo.waiting-human': "Answer the agent's question, then check again.",
    'todo.working': 'Let it work and check again in a moment.',
    'todo.undetermined': 'Check again in a few minutes or ask the agent whether it is still working. The rescue plan is ready just in case.',
    'todo.not-started': 'Start the agent or give it the start instruction.',
    'todo.unreadable': 'Fix the mission file (details below) and check again.',
    'todo.needs-confirmation': 'Check for yourself that the effect really happened, then confirm it in the plan below. Without your confirmation the mission will not turn green.',
    'reason.all-proven': 'All tasks ({total}) have a verified proof.',
    'reason.proof-failed': 'The agent reported task {task} as done, but the proof fails: {stateText}.',
    'reason.no-events': 'The work log is empty: the agent has not reported anything yet.',
    'reason.no-readable-log.files': 'The work log has no readable entry, but result files already exist (tasks: {tasks}). Check them before you start the agent, so that nothing is done twice.',
    'reason.no-readable-log.broken': 'No line of the work log can be read (details below). Fix the log before you start the agent.',
    'reason.future-time': "The last log entry is {ahead} later than this computer's clock. The agent probably writes its time in the wrong time zone, so its silence cannot be measured.",
    'reason.error-reported': 'The agent reported an error in task {task}: "{message}"',
    'reason.error-reported.no-task': 'The agent reported an error: "{message}"',
    'reason.limit-back-agent-not': 'The limit came back {until}, and the agent has not resumed since.',
    'reason.silence.partial': 'Task {task} started, its result file is unfinished, and there has been silence for {silence}. The agent did not say what it is waiting for.',
    'reason.silence.plain': 'Silence for {silence} during task {task}, with no stated reason.',
    'reason.question': 'The agent is waiting for your answer: "{question}"',
    'reason.agent-said-limit.yes': 'The agent said it is waiting for a limit, and the limit data agrees. Reset: {until}.',
    'reason.agent-said-limit.no': 'The agent said it is waiting for a limit. Reset: {until}.',
    'reason.inferred-from-limits': 'The agent said nothing, but the {plan} limit ({window}) is {used}% used until {until}. It is most likely waiting for the limit.',
    'reason.waiting-other': 'The agent said it is waiting: "{message}"',
    'reason.signs-of-life-only': 'The agent keeps sending signs of life ({beats} entries), but has not delivered any proven result for {since}.',
    'reason.short-silence': 'Silence for {silence}, longer than the expected {wait}, but too short to call it a failure. The task may simply take longer.',
    'reason.recent-progress': 'The last progress was recent ({at}).',
    'reason.recent-activity': 'The agent was active recently ({at}).',
    'reason.unreadable': 'The file {file} is missing or broken.',
    'reason.unreadable.detail': 'Cannot read the mission file: {detail}.',
    'reason.confirm-effects': 'The agent delivered results with verified files. {taskHas} an effect outside this computer, to be checked in {where}. No file can prove that: a person has to confirm it.',
    'reason.task-has.one': 'Task {tasks} has',
    'reason.task-has.many': 'Tasks {tasks} have',
    'fact.last-proven': 'Last proven result: task {task}, {at}',
    'fact.nothing-proven': 'No task has a proof yet',
    'fact.last-signal': 'Last signal: {eventText}{taskPart}, {at}',
    'fact.silence': 'Silent for: {ms}',
    'fact.waiting-time': 'Silence threshold for this task: {ms} (the mission threshold)',
    'fact.waiting-time.expected': 'Silence threshold for this task: {ms} (the longer of the mission threshold, {minimum} min, and 1.5 × the task\'s expected {expected} min)',
    'fact.partial-file': "Task {task}'s file exists but is unfinished: {file}",
    'fact.limit': '{plan} {window} limit: {used}%, reset {until} ({labelText})',
    'fact.limit-unknown': 'No current limit data for the {plan} plan',
    'fact.proven-count': '{proven} of {total} tasks proven',
    'fact.proof-state': 'Task {task}: {stateText} ({file})',
    'fact.effect-where': 'Task {task}: effect to check in {where}',
    'task.part': ' (task {task})',
    'state.proven': 'Proven',
    'state.effect-unconfirmed': 'Outside effect unconfirmed',
    'state.declared-no-artifact-info': 'Declared without proof',
    'state.undeclared-result': 'Uncertain effect: result present but not declared',
    'state.in-progress': 'In progress',
    'state.artifact-missing': 'Result file missing',
    'state.hash-mismatch': 'Fingerprint mismatch',
    'state.wrong-result': 'Wrong result',
    'state.wrong-file': 'Declared a different file than the mission requires',
    'state.failed': 'Failed',
    'state.not-started': 'Not started',
    'level.declared': 'Declared',
    'level.exists': 'File exists',
    'level.verified': 'Verified',
    'level.effect': 'Outside effect',
    'level.na': 'n/a',
    'level.partial': 'no file details',
    'detail.file': 'Result file',
    'detail.condition': 'Condition',
    'detail.declared-sha': 'Declared fingerprint',
    'detail.actual-sha': 'Computed fingerprint',
    'detail.none': 'none',
    'detail.where': 'Check the effect in',
    'detail.confirmed-by-human': 'Confirmed by a person {at}',
    'confirm.note': 'Only confirm what you have seen with your own eyes. The confirmation covers exactly this version of the file (fingerprint {sha}…) and is saved only in this browser.',
    'confirm.where': 'Check in {where}.',
    'check.contains': 'contains "{text}"',
    'check.json': '{path} = {expected}',
    'check.nonEmpty': 'is not empty',
    'checkfail.text-missing': 'text "{text}" is missing',
    'checkfail.value-differs': '{path} = {actual}, expected {expected}',
    'checkfail.invalid-json': 'the file is not valid JSON',
    'checkfail.empty': 'the file is empty',
    'problem.missing': 'Missing file {file}',
    'problem.invalid-json': '{file}{linePart}: invalid JSON',
    'problem.not-an-object': '{file}{linePart}: not a JSON object',
    'problem.unknown-format': '{file}: unknown format "{found}" (expected mission-rescue/1)',
    'problem.bad-title': '{file}: the mission has no title',
    'problem.no-tasks': '{file}: no task list',
    'problem.bad-task': '{file}: task {task} is broken',
    'problem.bad-task-id': '{file}: task {task} has a bad number',
    'problem.duplicate-task-id': '{file}: task number {task} is repeated',
    'problem.bad-task-title': '{file}: task {task} has no title',
    'problem.bad-artifact': "{file}: task {task}'s result file path is invalid",
    'problem.bad-check': '{file}: task {task} has an invalid condition',
    'problem.bad-effect': "{file}: task {task}'s outside effect is invalid",
    'problem.bad-time': '{file}{linePart}: invalid "at" time',
    'problem.time-without-zone': "{file}{linePart}: \"at\" time without a time zone ({count} such lines); read as this computer's time",
    'problem.unknown-event': '{file}{linePart}: unknown event "{found}"',
    'problem.unknown-task': '{file}{linePart}: unknown task {found}',
    'problem.missing-task': '{file}{linePart}: task number missing',
    'problem.unknown-source': '{file}: unknown limits source',
    'problem.bad-plan': '{file}: broken limit entry',
    'problem.line': ', line {line}',
    'limit.demo': 'DEMO',
    'limit.manual': 'MANUAL',
    'limit.auto-verified': 'AUTOMATICALLY VERIFIED',
    'limit.stale': 'OUT OF DATE',
    'limit.stale.reset-passed': 'the reset time has passed',
    'limit.stale.old-capture': 'captured {age} ago',
    'limit.captured': 'captured {at}',
    'limit.resets': 'resets {at}',
    'limit.empty': 'No limit data. Add it by hand or connect the Claude Code status line (README).',
    'limit.form.plan': 'Plan',
    'limit.form.window': 'Window',
    'limit.form.used': 'Used %',
    'limit.form.reset': 'Reset',
    'limit.note': 'Mission Rescue never logs in to chat sites to read limits.',
    'limit.form.title': 'A limit entered by hand',
    'limit.form.window.other': 'other',
    'limit.form.hint': "Copy the numbers from your service's usage screen. They are saved only in this browser and labelled MANUAL.",
    'limit.form.error': 'Enter the plan name and a usage from 0 to 100%.',
    'limit.manual.remove': 'Remove the manual entry {plan} {window}',
    'demo.agent.note': "The sample agent really computes the tasks' results from fictional data and writes them with SHA-256 fingerprints.",
    'demo.honesty.note': "The honesty test silently changes one day's total in a proven file. The condition still passes, so only the SHA-256 fingerprint can catch it.",
    'demo.reset.note': 'Restores the samples to their starting state (times counted from now).',
    'demo.agent.step.check': 'Task {task}: checking the effects before repeating…',
    'demo.agent.step.reuse': 'Task {task}: the result is already there and passes, reporting it without repeating.',
    'demo.agent.step.redo': 'Task {task}: the result is incomplete, doing it again.',
    'demo.agent.step.changed': 'Task {task}: the file changed after it was reported or holds a wrong result, doing it again.',
    'demo.agent.step.do': 'Task {task}: doing it.',
    'demo.agent.step.done': 'Task {task}: done, saved with its fingerprint.',
    'demo.agent.finished': 'The sample agent has finished. Press "Check again".',
    'demo.agent.finished.cli': 'The sample agent has finished. Now run "check" to verify the results.',
    'rescue.checkpoint': 'Last confirmed checkpoint',
    'rescue.checkpoint.task': 'task {task}',
    'rescue.checkpoint.none': 'none',
    'rescue.remaining': 'Remaining tasks',
    'rescue.steps': 'What to do with each task',
    'rescue.instruction': 'Resume instruction for the agent',
    'rescue.handover': 'Hand it to the agent yourself. Mission Rescue never runs anything.',
    'rescue.action.check-first': 'First check whether it already happened',
    'rescue.action.redo': 'Find what changed the file, then redo',
    'rescue.action.do': 'Do',
    'rescue.action.confirm': 'Confirm (a person)',
    'rescue.check': 'Check: {file} {condition}',
    'rescue.not-needed': 'No plan needed: everything is proven.',
    'rescue.confirm-only': "The agent has finished its part. A person's confirmation is still needed.",
    'demo.honesty.done': "I silently changed one day's total in task 3's file. Press \"Check again\".",
    'demo.local.note': 'On this computer, run the sample agent with:',
    'demo.local.honesty': 'Honesty test on disk:',
    'demo.local.reset': 'Restore the sample on disk:',
    'log.empty': 'The log is empty.',
    'footer.privacy': 'Mission Rescue reads files on your device. It sends nothing and never changes your missions.',
    'footer.source': 'Source code on GitHub (MIT licence)',
    'time.just-now': 'just now',
    'time.ago': '{d} ago',
    'time.in': 'in {d}',
  },
};

export function t(lang, key, params = {}) {
  const table = D[lang] || D.pl;
  const template = table[key] ?? D.pl[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? '' : String(params[name])));
}

// Free text from an agent or a mission: a string, or {pl, en}.
export function textIn(lang, value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.pl || value.en || '';
}

export function eventName(lang, event) {
  return (EVENT_NAMES[lang] || EVENT_NAMES.pl)[event] || event;
}

export function fmtDuration(ms, lang = 'pl') {
  if (!Number.isFinite(ms)) return '—';
  const minutes = Math.round(Math.abs(ms) / 60000);
  if (minutes < 1) return lang === 'en' ? 'less than a minute' : 'mniej niż minutę';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = [];
  if (days) parts.push(lang === 'en' ? `${days} d` : `${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (mins && !days) parts.push(`${mins} min`);
  return parts.join(' ');
}

export function fmtTime(iso, lang = 'pl', nowMs = Date.now()) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const locale = lang === 'en' ? 'en-GB' : 'pl-PL';
  const sameDay = new Date(nowMs).toDateString() === date.toDateString();
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${time}`;
}

export function fmtRelative(iso, lang = 'pl', nowMs = Date.now()) {
  if (!iso) return '—';
  const diff = Date.parse(iso) - nowMs;
  if (!Number.isFinite(diff)) return '—';
  if (Math.abs(diff) < 60000) return t(lang, 'time.just-now');
  const d = fmtDuration(diff, lang);
  return diff < 0 ? t(lang, 'time.ago', { d }) : t(lang, 'time.in', { d });
}

// ---- engine output → words -------------------------------------------------------

function checkText(lang, check) {
  if (!check) return '';
  if (check.type === 'contains') return t(lang, 'check.contains', { text: check.text });
  if (check.type === 'json') return t(lang, 'check.json', { path: check.path, expected: JSON.stringify(check.equals) });
  return t(lang, 'check.nonEmpty');
}

export function describeCheck(lang, check) {
  return checkText(lang, check);
}

export function describeCheckFailure(lang, result) {
  if (!result || result.ok) return '';
  if (result.code === 'text-missing') return t(lang, 'checkfail.text-missing', { text: result.text });
  if (result.code === 'value-differs') {
    return t(lang, 'checkfail.value-differs', { path: result.path, actual: JSON.stringify(result.actual), expected: JSON.stringify(result.expected) });
  }
  if (result.code === 'invalid-json') return t(lang, 'checkfail.invalid-json');
  return t(lang, 'checkfail.empty');
}

export function stateText(lang, state) {
  return t(lang, `state.${state}`);
}

export function describeReason(lang, verdict, nowMs = Date.now()) {
  const { key, params = {} } = verdict.reason || {};
  const time = (iso) => (iso ? `${fmtTime(iso, lang, nowMs)} (${fmtRelative(iso, lang, nowMs)})` : '—');
  switch (key) {
    case 'proof-failed':
      return t(lang, 'reason.proof-failed', { task: params.task, stateText: stateText(lang, params.state).toLowerCase() });
    case 'limit-back-agent-not':
      return t(lang, 'reason.limit-back-agent-not', { until: time(params.until) });
    case 'silence':
      return t(lang, params.partial ? 'reason.silence.partial' : 'reason.silence.plain', {
        task: params.task ?? '?',
        silence: fmtDuration(params.silenceMs, lang),
      });
    case 'agent-said-limit':
      return t(lang, params.corroborated ? 'reason.agent-said-limit.yes' : 'reason.agent-said-limit.no', { until: time(params.until) });
    case 'inferred-from-limits':
      return t(lang, 'reason.inferred-from-limits', { plan: params.plan, window: params.window, used: params.used, until: time(params.until) });
    case 'signs-of-life-only':
      return t(lang, 'reason.signs-of-life-only', { beats: params.beats, since: fmtDuration(params.sinceMs, lang) });
    case 'short-silence':
      return t(lang, 'reason.short-silence', { silence: fmtDuration(params.silenceMs, lang), wait: fmtDuration(params.waitMs, lang) });
    case 'recent-progress':
    case 'recent-activity':
      return t(lang, `reason.${key}`, { at: time(params.at) });
    case 'question':
      return t(lang, 'reason.question', { question: textIn(lang, params.question) });
    case 'unreadable':
      return params.problem
        ? t(lang, 'reason.unreadable.detail', { detail: describeProblem(lang, params.problem) })
        : t(lang, 'reason.unreadable', params);
    case 'waiting-other':
      return t(lang, 'reason.waiting-other', { message: textIn(lang, params.message) });
    case 'error-reported':
      return t(lang, params.task != null ? 'reason.error-reported' : 'reason.error-reported.no-task', { task: params.task, message: textIn(lang, params.message) });
    case 'no-readable-log': {
      const parts = [];
      if (params.tasks && params.tasks.length) parts.push(t(lang, 'reason.no-readable-log.files', { tasks: params.tasks.join(', ') }));
      else if (params.broken) parts.push(t(lang, 'reason.no-readable-log.broken'));
      return parts.join(' ');
    }
    case 'future-time':
      return t(lang, 'reason.future-time', { ahead: fmtDuration(params.aheadMs, lang) });
    case 'confirm-effects': {
      const ids = params.tasks || [];
      const and = lang === 'en' ? ' and ' : ' i ';
      const tasks = ids.length > 1 ? `${ids.slice(0, -1).join(', ')}${and}${ids[ids.length - 1]}` : String(ids[0] ?? '');
      return t(lang, 'reason.confirm-effects', {
        taskHas: t(lang, ids.length > 1 ? 'reason.task-has.many' : 'reason.task-has.one', { tasks }),
        where: textIn(lang, params.where),
      });
    }
    default:
      return t(lang, `reason.${key}`, params);
  }
}

export function limitLabelText(lang, entry, nowMs = Date.now()) {
  if (!entry) return '';
  const base = t(lang, `limit.${entry.label}`);
  if (entry.label !== 'stale') return base;
  const why = entry.staleReason === 'reset-passed'
    ? t(lang, 'limit.stale.reset-passed')
    : t(lang, 'limit.stale.old-capture', { age: fmtDuration(nowMs - (entry.capturedAtMs ?? nowMs), lang) });
  return `${base} (${why})`;
}

export function describeFact(lang, fact, nowMs = Date.now()) {
  const p = fact.params || {};
  const time = (iso) => (iso ? `${fmtTime(iso, lang, nowMs)} (${fmtRelative(iso, lang, nowMs)})` : '—');
  switch (fact.key) {
    case 'last-proven':
      return t(lang, 'fact.last-proven', { task: p.task, at: time(p.at) });
    case 'last-signal':
      return t(lang, 'fact.last-signal', {
        eventText: eventName(lang, p.event),
        taskPart: p.task != null ? t(lang, 'task.part', { task: p.task }) : '',
        at: time(p.at),
      });
    case 'silence':
      return t(lang, 'fact.silence', { ms: fmtDuration(p.ms, lang) });
    case 'waiting-time':
      return t(lang, p.expected ? 'fact.waiting-time.expected' : 'fact.waiting-time', { ms: fmtDuration(p.ms, lang), expected: String(p.expected).replace('.', lang === 'en' ? '.' : ','), minimum: p.minimum });
    case 'limit':
      return t(lang, 'fact.limit', {
        plan: p.plan,
        window: p.window,
        used: p.used,
        until: p.until ? fmtTime(p.until, lang, nowMs) : '—',
        labelText: t(lang, `limit.${p.label}`),
      });
    case 'proof-state':
      return t(lang, 'fact.proof-state', { task: p.task, stateText: stateText(lang, p.state), file: p.file });
    case 'effect-where':
      return t(lang, 'fact.effect-where', { task: p.task, where: textIn(lang, p.where) });
    default:
      return t(lang, `fact.${fact.key}`, p);
  }
}

export function describeProblem(lang, problem) {
  const linePart = problem.line ? t(lang, 'problem.line', { line: problem.line }) : '';
  return t(lang, `problem.${problem.code}`, { ...problem, linePart });
}
