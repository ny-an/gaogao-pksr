# 料理パズル GA4計測

## 対象と送信環境

- Measurement ID: `G-Q5BGCQDCV6`
- 対象: V2（`koiki-puzzle-v2.html`）／サバイバル（`koiki-puzzle.html`）
- 送信許可: `https://ny-an.github.io`のみ
- `file://`、localhost、テスト環境ではGA4スクリプトを読み込まず、イベントも送信しない
- 個人・端末を独自に識別するIDは追加しない
- 盤面、セーブデータ、バッグ内訳、ロック状態、自由入力、デバッグ情報は送信しない

## イベント

| イベント | 発火条件 | パラメータ |
| --- | --- | --- |
| `puzzle_play_start` | 新しいゲームの状態を作成した時。モード選択画面を開いただけでは送らない | `game_version`, `game_mode`, `category` |
| `puzzle_resume` | V2で保存中モードの「つづきから」を選び、復元に成功した時 | `game_version`, `game_mode`, `category`, `dish_number`, `moves_remaining`, `total_energy` |
| `puzzle_meal_complete` | 料理エナジーと累計値が確定した時。1品につき1回 | `game_version`, `game_mode`, `category`, `dish_number`, `recipe_level`, `cooking_energy`, `total_energy`, `success_type` |
| `puzzle_play_end` | 手数切れ、21食完走、モード変更確定、明示終了で結果が確定した時。同一プレイ1回 | `game_version`, `game_mode`, `category`, `end_reason`, `dishes_completed`, `total_energy`, `max_cooking_energy`, `max_chain`, `recipe_level` |
| `share` | 結果画面のXシェアボタンを押した時 | `method: x`, `content_type: puzzle_result`, `item_id: v2\|survival` |

`page_view`は閲覧計測のままとし、プレイ回数は`puzzle_play_start`のイベント数で集計する。

### 固定値

- `game_version`: `v2`, `survival`
- `game_mode`: `endless`, `normal`, `ex`, `survival`
- `category`: `curry`, `salad`, `dessert`, `all`
- `success_type`: `normal`, `extra_tasty`, `super_success`
- `end_reason`: `moves_zero`, `week_complete`, `mode_change`, `manual_end`

サバイバルは現在、ページ読込時に途中データを自動復元し、プレイヤーが明示的に再開を選ぶUIがない。自動復元やリロードを再開回数へ含めない方針に従い、サバイバルでは現状`puzzle_resume`を送信しない。

## GA4管理画面で必要な設定

管理画面への登録は未実施。GA4の「管理 > カスタム定義」で次をイベントスコープとして登録する。

### カスタムディメンション候補

- `game_version`
- `game_mode`
- `category`
- `end_reason`
- `success_type`

### カスタム指標候補

- `dish_number`
- `dishes_completed`
- `moves_remaining`
- `recipe_level`
- `cooking_energy`
- `total_energy`
- `max_cooking_energy`
- `max_chain`

## 集計の基準

- プレイ開始回数: `puzzle_play_start`のイベント数
- V2／サバイバル比率: `game_version`別の開始回数
- モード選択割合: `game_mode`別の開始回数
- 途中再開回数: `puzzle_resume`のイベント数
- 料理完成数: `puzzle_meal_complete`のイベント数
- 21食完走率: `game_mode`が`normal`または`ex`の開始数に対する、`end_reason = week_complete`の終了数
- 手数切れ率／モード変更終了率: 開始数に対する各`end_reason`の終了数
- Xシェア率: 開始数に対する`share`イベント数
- エナジー、到達食数、最大料理エナジー、最大連鎖: 終了イベントの数値指標を使用

## 未確認事項

- GA4管理画面のカスタム定義登録
- 公開環境のRealtime／DebugViewでの実受信
- サバイバルへ将来、明示的な再開UIを追加した場合の`puzzle_resume`接続
