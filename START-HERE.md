# OmniGraph Android: начни здесь

Рабочая папка:

```text
/data/data/com.termux/files/home/projects/omnigraph-android
```

Открой обычный Termux, не Debian/Ubuntu через PRoot:

```sh
cd /data/data/com.termux/files/home/projects/omnigraph-android
pkg install rust clang lld cmake ninja pkg-config protobuf
rustc -vV
cargo build --release --locked -p omnigraph-cli
./target/release/omnigraph --version
```

В выводе `rustc -vV` host должен оканчиваться на `linux-android`. Если там
`linux-gnu`, выйди из PRoot командой `exit` и начни снова.

## Куда смотреть

- `ANDROID.md` — полная команда сборки и сквозная проверка `init/load/query`.
- `crates/omnigraph-cli/Cargo.toml` — что входит в CLI.
- `crates/omnigraph-cli/src/main.rs` — точка входа CLI.
- `Cargo.toml` — версии Lance, DataFusion и общие зависимости.
- `Cargo.lock` — точные версии упавших зависимостей.

Не открывай исходники Lance заранее. Сначала получи первую конкретную ошибку.

## Plan B: сборка упала

Сохрани лог:

```sh
cargo build --release --locked -p omnigraph-cli \
  2>&1 | tee "$PREFIX/tmp/omnigraph-build.log"
```

Смотри первую ошибку и выбери один путь:

- `command not found` или отсутствующий header — установи ровно названный пакет
  через `pkg install`, затем повтори сборку.
- Ошибка `aws-lc-sys`, `ring` или `zstd-sys` — исправь только конфигурацию
  указанного build script для Android; engine не трогай.
- Ошибка в Lance — создай ветку `android-lance-fix` и добавь минимальный Android
  `cfg` в конкретном упавшем месте; не форкай Lance целиком.
- Неподдерживаемый server/cluster код — отдели эти команды Cargo feature-флагом,
  сохранив локальные `init`, `schema`, `load`, `query`, `snapshot` и `doctor`.
- Сборка прошла, но `init` снова вернул `EPERM` — приложи нативный лог к
  [issue #453](https://github.com/ModernRelay/omnigraph/issues/453) и временно
  запускай OmniGraph server на обычной Linux-машине.

Если исправление затрагивает больше одного зависимого crate, остановись и оформи
upstream issue с `$PREFIX/tmp/omnigraph-build.log`: это уже Android-порт, а не
настройка сборки.

<!-- ponytail: one-error-at-a-time Android port; introduce a maintained patch stack only after two upstream-rejected fixes are both required. -->
