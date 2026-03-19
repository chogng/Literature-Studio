# Source Extractors

杩欎唤鐩綍涓嬬殑 `source extractor` 鐢ㄦ潵鍛婅瘔 `articleFetcher`:

- 鏌愪釜棣栭〉/鍒楄〃椤垫槸鍚︽湁涓撶敤鎻愬彇閫昏緫
- 搴旇浠庨〉闈㈤噷浼樺厛鎶藉嚭鍝簺鏂囩珷閾炬帴
- 杩欎簺閾炬帴鍦ㄩ〉闈腑鐨勯『搴忔槸浠€涔?- 鑳戒笉鑳介『鎵嬫嬁鍒?`dateHint`銆乣articleType`銆乣scoreBoost`
- 鏄惁瀛樺湪绋冲畾鐨勪笅涓€椤靛叆鍙?- 鏄惁闇€瑕佸仛涓€娆¤交閲忕殑浜屾琛ュ叏

杩欏鏈哄埗鐨勭洰鏍囦笉鏄€滃彇浠ｉ€氱敤鎶撳彇鍣ㄢ€濓紝鑰屾槸鍦ㄦ垜浠凡缁忕煡閬撴煇涓〉闈㈢粨鏋勬瘮杈冪ǔ瀹氥€佽€屼笖鍊煎緱浼樺寲鏃讹紝缁欏畠涓€鏉℃洿纭畾鐨勫€欓€夋彁鍙栬矾寰勩€?
`nature-latest-news.ts` 鏄綋鍓嶆渶瀹屾暣鐨勪緥瀛愶紝涔熷緢閫傚悎浣滀负鍚庣画鏂板涓撶敤 extractor 鐨勬ā鏉裤€?
## Nature 鍥哄畾鍏ュ彛绛栫暐锛堝綋鍓嶇粨璁猴級

瀵?`www.nature.com` 杩欎笁涓浐瀹氬叆鍙ｏ紝寤鸿榛樿閮戒繚鐣欎笓鐢?extractor锛岃€屼笉鏄粎渚濊禆閫氱敤鎶撳彇锛?
- `/latest-news`
- `/opinion`
- `/{journal}/research-articles`锛堜緥濡?`/nature/research-articles`锛?
鍘熷洜寰堢洿鎺ワ細

- 閮芥槸楂橀鍏ュ彛锛岀敤鎴峰父浠庤繖浜涘垪琛ㄩ〉鎶撯€滄渶鏂扳€濇枃绔?- 椤甸潰閲屾湁绋冲畾缁撴瀯鍖栦俊鍙凤紙鍗＄墖銆侀『搴忋€佺被鍨嬨€佹棩鏈熴€佸垎椤碉級
- 涓撶敤 extractor 鍙互绋冲畾杈撳嚭 `order` / `dateHint` / `articleType`
- 褰撻〉闈㈠眬閮ㄦ敼鐗堟椂锛屽彲浠モ€滃畾鍒舵彁鍙?+ shared fallback鈥濆噺灏戝洖褰掗闄?
## 璁捐瀹氫綅

鍦ㄤ富娴佺▼閲岋紝extractor 鐨勮亴璐ｅ緢鍏嬪埗:

1. `matches(page)` 璐熻矗鍒ゆ柇褰撳墠 URL 鏄惁鍛戒腑鏌愪釜涓撶敤瀹炵幇銆?2. `extract(context)` 璐熻矗浠庨椤?DOM 涓彁鍙栧€欓€夋枃绔犵瀛愩€?3. `refineExtraction(context)` 鍙€夛紝璐熻矗鍦ㄥ凡鏈夊€欓€夊熀纭€涓婅ˉ鍏呬俊鎭€?4. `findNextPageUrl(context)` 鍙€夛紝璐熻矗鍛婅瘔涓绘祦绋嬪浣曠炕鍒颁笅涓€椤点€?
鍚庣画杩欎簺浜嬫儏渚濈劧鐢辩粺涓€娴佹按绾胯礋璐?

- URL 褰掍竴鍖?- 鍚屽煙杩囨护
- 鏃ユ湡鑼冨洿杩囨护
- 鍊欓€夋帓搴忎笌鎶撳彇棰勭畻
- 姝ｆ枃鎶撳彇涓庢鏂囪В鏋?
涔熷氨鏄锛宔xtractor 鍙礋璐ｂ€滄洿鍑嗙‘鍦版寚鍑哄簲璇ュ厛璇曞摢浜涢摼鎺モ€濓紝涓嶈礋璐ｉ噸鍐欐暣鏉℃姄鍙栭摼璺€?
## `nature-latest-news` 鏄€庝箞鍋氬嚭鏉ョ殑

`nature-latest-news.ts` 閲囩敤浜嗏€滃畾鍒舵彁鍙?+ 閫氱敤鍏滃簳 + 浜屾琛ュ叏鈥濈殑涓夊眰缁撴瀯銆?
### 1. 鍏堢敤璺緞绮剧‘鍖归厤椤甸潰

瀹冨厛鎶婇椤甸檺瀹氬湪:

- host: `www.nature.com`
- pathname: `/latest-news`

杩欐牱鑳界‘淇濊繖浠介€昏緫鍙湇鍔′簬涓€涓潪甯稿叿浣撶殑椤甸潰锛屼笉浼氳浼ゅ埆鐨?Nature 鍒楄〃椤点€?
### 2. 閽堝椤甸潰鍗＄墖缁撴瀯鍋氬畾鍒舵彁鍙?
`extractNatureLatestNewsArticleCards()` 浼氱洿鎺ヨ鍙?`latest-news` 椤甸潰鐨勫崱鐗?DOM锛屾牳蹇冩€濊矾鏄?

- 鍏堥攣瀹氬崱鐗囨牴鑺傜偣 `div.c-article-item__wrapper`
- 鍦ㄦ瘡寮犲崱鐗囬噷鎵炬枃绔犻摼鎺ャ€佹爣棰樸€佹憳瑕併€乫ooter銆乤rticle type
- 浠?`data-track-label` 涓彁鍙栧崱鐗囬『搴?- 浠?footer 鎴栨椂闂寸浉鍏宠妭鐐归噷鎻愬彇 `dateHint`
- 鍘婚噸骞朵骇鍑?`ListingCandidateSeed[]`

杩欓噷杩斿洖鐨勫€欓€夌瀛愰暱杩欐牱:

```ts
{
  href,
  order,
  dateHint,
  articleType,
  scoreBoost: 140,
}
```

鍑犱釜瀛楁鍚勮嚜鐨勪綔鐢?

- `href`: 鍊欓€夋枃绔犻摼鎺ワ紝鍙互鏄浉瀵硅矾寰勶紝涓绘祦绋嬩細鍐嶅綊涓€鍖?- `order`: 椤甸潰涓殑灞曠ず椤哄簭锛屼笓鐢?extractor 鍛戒腑鍚庝富娴佺▼浼氫紭鍏堟寜杩欎釜椤哄簭鎶撳彇
- `dateHint`: 鐢ㄦ潵鍋氭棩鏈熻寖鍥磋繃婊ゃ€佹彁鍓嶅仠姝€侀绠椾紭鍖?- `articleType`: 鏂逛究鍚庣画璇婃柇鎴栫壒瀹氱瓥鐣ュ垎娴?- `scoreBoost`: 鍦ㄧ粺涓€鎵撳垎鍩虹涓婂啀缁欎竴鐐圭粨鏋勫寲鍔犳潈

### 3. 甯︿笂 diagnostics锛屾柟渚挎垜浠皟璇曞拰婕旇繘

`latest-news` 鐨勫疄鐜版病鏈夊彧杩斿洖 candidates锛屽畠杩橀澶栬褰曚簡:

- 鍛戒腑鐨?selector
- 鍗＄墖鎬绘暟銆佸€欓€夋€绘暟
- 鏈夋憳瑕?鏈?footer/鏈?article type 鐨勫崱鐗囨暟
- 宸叉嬁鍒版棩鏈熸彁绀虹殑鍊欓€夋暟
- `articleTypeCounts`
- `sampleCards`

杩欓潪甯稿€煎緱淇濈暀銆傚洜涓轰笓鐢?extractor 涓嶆槸鈥滀竴娆″啓瀹屾案杩滅ǔ瀹氣€濓紝鍚庨潰椤甸潰缁撴瀯鍙樹簡锛屾垜浠€氬父鍏堢湅鐨勫氨鏄繖浜?diagnostics銆?
### 4. 濡傛灉瀹氬埗鎻愬彇澶辫触锛屽氨鍥為€€鍒板叡浜垪琛ㄩ〉 extractor

`nature-latest-news.ts` 骞朵笉鏄绔嬪疄鐜般€傚畠鍏堝皾璇曢拡瀵?`latest-news` 鍋氱簿纭娊鍙栵紝濡傛灉缁撴灉涓虹┖锛屽啀鍥為€€鍒?

```ts
createNatureListingCandidateExtractor(...)
```

杩欎釜 shared extractor 浣嶄簬 `nature-listing-shared.ts`锛屽畠鎻愪緵鐨勬槸涓€濂楁洿娉涘寲鐨?Nature 鍒楄〃椤佃瘑鍒€昏緫锛屾瘮濡?

- 閫夋嫨鏈€鍍忔枃绔犲垪琛ㄧ殑 layout root
- 浠?tracked link 鎴?article link 鍙嶆帹鍗＄墖 root
- 浠?`Rank:(n)` 鎴?`article card n` 涓仮澶嶉『搴?- 灏濊瘯鎻愬彇鍒楄〃椤垫棩鏈?- 缁熶竴鐢熸垚 diagnostics

杩欏眰鍏滃簳寰堥噸瑕侊紝鍥犱负瀹冭鎴戜滑鐨勪笓鐢?extractor 鍏峰涓や釜鐗圭偣:

- 椤甸潰缁撴瀯绋冲畾鏃讹紝鍚冨埌鏈€绮剧‘鐨勫畾鍒堕€昏緫
- 椤甸潰灞€閮ㄥ彉鍔ㄦ椂锛岃繕鏈夎緝閫氱敤鐨勫浠借矾寰?
### 5. 鍐嶉€氳繃 `refineExtraction()` 鐢?RSS 琛ラ綈缂哄け鏃ユ湡

`latest-news` 鐨勫叧閿寮虹偣鍦ㄨ繖閲屻€?
鏈変簺鍗＄墖鏈韩娌℃湁绋冲畾鏃ユ湡锛屼絾 Nature 鐨?RSS 閲屾湁 `dc:date`銆傛墍浠ユ垜浠湪 `refineExtraction()` 閲屽仛浜嗚繖浠朵簨:

1. 璇锋眰 `https://www.nature.com/nature.rss`
2. 瑙ｆ瀽 `<item rdf:about="...">` 鍜屽搴旂殑 `<dc:date>`
3. 寤虹珛 `url -> dateHint` 鏄犲皠
4. 鍙粰鈥滆繕娌℃湁 `dateHint` 鐨勫€欓€夆€濊ˉ鍊?5. 鍋氫竴涓?5 鍒嗛挓鍐呭瓨缂撳瓨锛岄伩鍏嶉绻佽姹?RSS

杩欐牱鍋氱殑鏀剁泭闈炲父鐩存帴:

- 鎻愰珮 `dateHint` 瑕嗙洊鐜?- 璁╀富娴佺▼鏇村鏄撳仛鏃ユ湡鑼冨洿杩囨护
- 鏇村鏄撹Е鍙戔€滃凡缁忚繛缁湅鍒拌繃鏃ф枃绔狅紝鍙互鎻愬墠鍋滄缈婚〉/鎶撳彇鈥濈殑浼樺寲

### 6. 缈婚〉閫昏緫澶嶇敤鍏变韩瀹炵幇

`latest-news` 鐨?`findNextPageUrl()` 骞舵病鏈夎嚜宸遍噸鍐欏垎椤佃鍒欙紝鑰屾槸澶嶇敤浜?`findNatureListingNextPageUrl()`銆?
鍏变韩鍒嗛〉閫昏緫浼?

- 璇诲彇褰撳墠 URL 鐨?`page` 鍙傛暟
- 鍦ㄥ綋鍓嶉〉闈㈤噷鎵惧悓 pathname銆佷笅涓€椤甸〉鐮佺殑閾炬帴
- 浼樺厛璇嗗埆甯?`next` 璇箟鐨勬寜閽垨閾炬帴
- 閰嶅悎 `seenPageUrls` 閬垮厤寰幆缈婚〉

杩欒鏄庢ā鏉块噷鏈変竴涓緢閲嶈鐨勫師鍒?

- 涓撶敤 extractor 鍙噸鍐欌€滅湡鐨勯渶瑕佺壒娈婂鐞嗏€濈殑閮ㄥ垎
- 閫氱敤鍒嗛〉銆侀€氱敤甯冨眬璇嗗埆浼樺厛澶嶇敤宸叉湁鑳藉姏

## 涓轰粈涔堝畠閫傚悎浣滀负妯℃澘

鍥犱负瀹冨熀鏈鐩栦簡鍚庣画鎴戜滑浼氶亣鍒扮殑涓夌 extractor 褰㈡€併€?
### 褰㈡€?A: 鍙敤 shared extractor锛堟瀬绠€锛?
閫傜敤浜庣粨鏋勪笉绋冲畾銆佷环鍊间竴鑸紝鎴栨殏鏃惰繕涓嶅€煎緱缁存姢瀹氬埗 selector 鐨勯〉闈細

- 浠呭疄鐜?`matches`
- 鐩存帴澶嶇敤 `createNatureListingCandidateExtractor`
- 鐩存帴澶嶇敤鍏变韩鍒嗛〉

### 褰㈡€?B: 瀹氬埗鎻愬彇 + shared fallback锛堟帹鑽愰粯璁わ級

鍙傝€?`nature-opinions.ts` 涓?`nature-research-articles.ts`:

- 鍏堝仛瀹氬埗 DOM 鎻愬彇锛堝崱鐗囥€侀『搴忋€佹棩鏈熴€佺被鍨嬶級
- 瀹氬埗鎻愬彇澶辫触鏃跺洖閫€鍒?shared extractor
- 鍒嗛〉閫昏緫澶嶇敤鍏变韩瀹炵幇

杩欐槸鐜板湪 `Nature` 鍥哄畾鍏ュ彛鏈€甯歌涔熸渶绋崇殑褰㈡€併€?
### 褰㈡€?C: 瀹氬埗鎻愬彇 + shared fallback + refine锛堝寮虹増锛?
鍙傝€?`nature-latest-news.ts`:

- 瀹氬埗 DOM 鎻愬彇
- shared extractor 鍏滃簳
- `refineExtraction()` 寮曞叆澶栭儴杞婚噺淇″彿锛堝 RSS锛夎ˉ榻愮己澶卞瓧娈?
閫傜敤浜庘€滃垪琛?DOM 涓嶆€绘槸缁欏叏淇℃伅锛屼絾鏈夊彲鐢ㄥ閮ㄨˉ鍏呮簮鈥濈殑椤甸潰銆?
## 鏂板 extractor 鐨勬帹鑽愭楠?
浠ュ悗鏂板仛涓€涓€滈摼鎺ヤ笓鐢ㄦ彁鍙栧櫒鈥濇椂锛屽缓璁寜涓嬮潰鐨勯『搴忚蛋銆?
### 1. 鍏堢‘璁ゅ€间笉鍊煎緱鍋氫笓鐢?extractor

涓€鑸弧瓒充互涓嬫儏鍐靛啀鍋?

- 杩欎釜椤甸潰鏄ǔ瀹氬叆鍙ｏ紝鐢ㄦ埛浼氶绻佷粠杩欓噷鎶撴渶鏂版枃绔?- 閫氱敤鎻愬彇宸茬粡涓嶅鍑嗭紝鎴栬€呴『搴忎笉绋冲畾
- 椤甸潰涓婂瓨鍦ㄦ槑鏄剧殑缁撴瀯鍖栦俊鍙凤紝鍊煎緱鍒╃敤
- 鎴戜滑鑳界ǔ瀹氳瘑鍒垎椤垫垨鏃ユ湡绾跨储

濡傛灉椤甸潰鏈韩缁撴瀯鍙樺寲寰堝ぇ锛岃€屼笖娌℃湁鏄庢樉瑙勫緥锛屼紭鍏堢户缁緷璧栭€氱敤閫昏緫銆?
### 2. 鍏堥€?extractor 褰㈡€?
鏂板椤甸潰鍓嶏紝鍏堝垽鏂畠灞炰簬鍝竴绫?

1. 鍙渶瑕?`matches + shared extractor`
2. 闇€瑕佽嚜瀹氫箟 `extract`
3. 闇€瑕佽嚜瀹氫箟 `extract + refineExtraction`

杩欎釜鍒ゆ柇鑳介伩鍏嶄竴寮€濮嬪氨鎶婂疄鐜板啓寰楄繃閲嶃€?
### 3. 鍏堝啓 `matches()`

寤鸿浼樺厛浣跨敤鏈€绋冲畾鐨?URL 淇″彿:

- host
- pathname
- 蹇呰鏃跺啀鍔?query 绾︽潫

`matches()` 瓒婄簿纭紝璇懡涓殑椋庨櫓瓒婁綆銆?
### 4. 鍐冲畾鍊欓€夋牴鑺傜偣鍜岄『搴忔潵婧?
鍦ㄥ啓 selector 涔嬪墠锛屽厛鍥炵瓟涓や釜闂:

- 涓€绡囨枃绔犲湪 DOM 閲屸€滃摢涓€灞傗€濇渶閫傚悎浣滀负鍊欓€?root
- 椤甸潰椤哄簭鏄潵鑷?DOM 椤哄簭銆乺ank銆佽繕鏄?tracking attribute

椤哄簭瀛楁闈炲父鍏抽敭锛屽洜涓哄懡涓笓鐢?extractor 鍚庯紝涓绘祦绋嬩細鏇翠俊浠?`order`銆?
### 5. 浼樺厛鎻愬彇 `dateHint`

鍙椤甸潰閲屾湁浠讳綍姣旇緝鍙潬鐨勬棩鏈熸潵婧愶紝閮藉敖閲忔彁鍑烘潵:

- `time[datetime]`
- `content`
- `title`
- footer 鏂囨湰
- aria label
- 澶栭儴杞婚噺鏁版嵁婧愶紝姣斿 RSS

`dateHint` 瓒婂畬鏁达紝鍚庨潰鐨勬姄鍙栨晥鐜囪秺楂樸€?
### 6. diagnostics 浣滀负榛樿閰嶇疆锛岃€屼笉鏄檮鍔犻」

姣忎釜 extractor 鏈€灏戝缓璁褰?

- 鍛戒腑鐨?layout/card/link selector
- 鏍硅妭鐐规暟 / 鍊欓€夋暟
- `datedCandidateCount`
- 鑻ユ湁鍒嗙被淇℃伅锛屽垯璁板綍 type counts
- 2 鍒?5 鏉?sample candidates

杩欐牱鍚庨潰鍒嗘瀽璇姄銆佹紡鎶撱€侀〉闈㈡敼鐗堟椂浼氳交鏉惧緢澶氥€?
### 7. 鏈夊叡浜兘鍔涘氨澶嶇敤锛屼笉瑕佸鍒?
濡傛灉浠ヤ笅鑳藉姏宸茬粡鍦ㄥ埆澶勫瓨鍦紝浼樺厛澶嶇敤:

- 鍚屼竴绔欑偣鐨勫垪琛ㄩ〉缁撴瀯璇嗗埆
- 鍒嗛〉鏌ユ壘
- rank / track label 瑙ｆ瀽
- 鏃ユ湡瀛楃涓茶В鏋?
鎴戜滑甯屾湜姣忎釜鏂?extractor 鍙啓鈥滄柊澧炵殑绔欑偣鐭ヨ瘑鈥濓紝鑰屼笉鏄噸澶嶅啓鍩虹璁炬柦銆?
### 8. 娉ㄥ唽鍒?`index.ts`

鍐欏畬 extractor 鍚庯紝鍒繕浜嗗湪 `index.ts` 閲屾敞鍐岋紝鍚﹀垯涓绘祦绋嬫案杩滀笉浼氬懡涓畠銆?
## 涓€涓帹鑽愮殑妯℃澘楠ㄦ灦

涓嬮潰鏄垜浠悗缁柊寤轰笓鐢?extractor 鏃跺彲浠ョ洿鎺ョ収鐫€鏀圭殑楠ㄦ灦:

```ts
import {
  createNatureListingCandidateExtractor,
  findNatureListingNextPageUrl,
  isNatureListingPage,
} from './nature-listing-shared.js';

import type {
  ListingCandidateExtraction,
  ListingCandidateExtractor,
  ListingCandidateExtractorContext,
  ListingCandidateRefinementContext,
  ListingPaginationContext,
} from './types.js';

const LISTING_PAGE_PATH = '/target-path';

const fallbackExtractor = createNatureListingCandidateExtractor({
  id: 'target-extractor',
  matches: isTargetListingPage,
  findNextPageUrl: findTargetNextPageUrl,
  refineExtraction: refineTargetExtraction,
});

export const targetCandidateExtractor: ListingCandidateExtractor = {
  id: 'target-extractor',
  matches: isTargetListingPage,
  findNextPageUrl: findTargetNextPageUrl,
  refineExtraction: refineTargetExtraction,
  extract(context): ListingCandidateExtraction | null {
    const targeted = extractTargetCards(context);
    if (targeted && targeted.candidates.length > 0) {
      return targeted;
    }

    return fallbackExtractor.extract(context);
  },
};

export function isTargetListingPage(page: URL) {
  return isNatureListingPage(page, LISTING_PAGE_PATH);
}

function extractTargetCards(
  context: ListingCandidateExtractorContext,
): ListingCandidateExtraction | null {
  // 1. 閿佸畾鍗＄墖 root
  // 2. 鎻愬彇 href/title/order/dateHint
  // 3. 鍘婚噸
  // 4. 杩斿洖 diagnostics
  return null;
}

async function refineTargetExtraction(
  context: ListingCandidateRefinementContext,
) {
  // 鍙€?
  // - 璇锋眰杞婚噺澶栭儴鏁版嵁
  // - 鍙ˉ榻愮己澶卞瓧娈?  // - 杩斿洖琛ュ叏鍚庣殑 extraction
  return context.extraction;
}

function findTargetNextPageUrl(
  context: ListingPaginationContext,
) {
  if (!isTargetListingPage(context.page)) return null;
  return findNatureListingNextPageUrl(context);
}
```

濡傛灉鏂伴〉闈㈡牴鏈笉闇€瑕佸畾鍒?`extract()`锛岄偅灏辩洿鎺ラ€€鍖栨垚鈥滃彧鐢?shared extractor鈥濈殑鏋佺畝鐗堟湰鍗冲彲銆?
## 浠ｇ爜灞傞潰鐨勭害鏉熷拰缁忛獙

鍚庣画鏂板 extractor 鏃讹紝寤鸿榛樿閬靛畧涓嬮潰杩欎簺绾︽潫銆?
### 1. `extract()` 灏介噺绾?
鏈€濂借 `extract()` 鍙緷璧栧綋鍓?DOM锛屼笉鍋氱綉缁滆姹傘€傜綉缁滆ˉ鍏ㄤ紭鍏堟斁鍒?`refineExtraction()`銆?
杩欐牱鏈変袱涓ソ澶?

- 缁撴瀯鏇存竻妤?- 褰撲富娴佺▼鍙兂鎷块杞€欓€夋椂锛屼笉浼氳棰濆璇锋眰鎷栨參

### 2. 澶栭儴琛ュ叏鍙仛鈥滃姞娉曗€?
`refineExtraction()` 鏈€濂藉彧琛ラ綈缂哄け瀛楁锛屼笉瑕佽交鏄撴帹缈诲凡缁忎粠 DOM 鎷垮埌鐨勪俊鎭€?
`latest-news` 灏辨槸杩欐牱鍋氱殑:

- DOM 宸茬粡鏈?`dateHint` 鐨勫€欓€変繚鎸佷笉鍔?- 鍙粰娌℃湁鏃ユ湡鐨勫€欓€夎ˉ RSS 鏃ユ湡

### 3. `order` 瑕佺ǔ瀹氥€佸彲瑙ｉ噴

涓撶敤 extractor 涓€鏃﹀懡涓紝涓绘祦绋嬩細鏇村亸鍚戞寜 `order` 鎶撳彇锛屾墍浠ヨ繖涓瓧娈靛繀椤诲敖閲忕ǔ瀹?

- 浼樺厛浣跨敤椤甸潰鑷韩鐨?rank / track label
- 娌℃湁鐨勮瘽鍐嶅洖閫€鍒?DOM discovery order

### 4. `scoreBoost` 瑕佷繚瀹?
`scoreBoost` 鍙槸杈呭姪锛屼笉搴旇鎺╃洊鏄庢樉閿欒鐨勫€欓€夈€備竴鑸粰涓€涓腑绛夊箙搴﹀姞鍒嗗氨澶熶簡锛岄噸鐐硅繕鏄潬 selector 鍛戒腑璐ㄩ噺鍜?`order`銆?
### 5. 鍏佽浼橀泤澶辫触

濡傛灉 selector 鍏ㄩ儴澶辨晥锛宔xtractor 搴旇杩斿洖 `null` 鎴栫┖缁撴灉锛岀劧鍚庢妸鏈轰細浜よ繕缁?

- fallback extractor
- 閫氱敤鍊欓€夋彁鍙栭€昏緫

涓嶈鍦ㄧ粨鏋勫彉鍖栨椂鎶婃暣鏉￠摼璺崱姝汇€?
## 鎺ㄨ崘鐨勬柊澧?checklist

- 鏂伴〉闈㈡槸鍚︾湡鐨勯渶瑕佷笓鐢?extractor
- `matches()` 鏄惁瓒冲绮剧‘
- 鍊欓€?root 鏄惁鍞竴涓旂ǔ瀹?- `href` / `title` 鏄惁閮借兘绋冲畾鎷垮埌
- `order` 鏄惁鍜岄〉闈㈠睍绀洪『搴忎竴鑷?- `dateHint` 鏄惁灏介噺瑕嗙洊
- diagnostics 鏄惁瓒冲鎺掓煡闂
- 鏄惁瀛樺湪鍙互澶嶇敤鐨?shared extractor / shared pagination
- 鏄惁宸茬粡鍦?`index.ts` 娉ㄥ唽

## 褰撳墠鐩綍閲岀殑鍙傝€冨疄鐜?
- `types.ts`: extractor 鎺ュ彛涓庝笂涓嬫枃绫诲瀷
- `index.ts`: extractor 娉ㄥ唽鍏ュ彛
- `nature-listing-shared.ts`: Nature 鍒楄〃椤电殑鍏变韩鑳藉姏
- `nature-opinions.ts`: 瀹氬埗鎻愬彇 + shared fallback锛堟棤 refine锛?- `nature-research-articles.ts`: 瀹氬埗鎻愬彇 + shared fallback锛堟棤 refine锛?- `nature-latest-news.ts`: 瀹氬埗鎻愬彇 + shared fallback + refine锛堝畬鏁存ā鏉匡級

## 涓€鍙ヨ瘽缁撹

瀵?Nature 褰撳墠杩欎笁绫诲浐瀹氬叆鍙ｏ紙`latest-news`銆乣opinion`銆乣research-articles`锛夛紝閮藉簲浼樺厛浣跨敤涓撶敤 extractor锛屽苟娌跨敤 `nature-latest-news` 杩欏妯″紡:

- 鐢ㄧ簿纭?`matches()` 闄愬畾椤甸潰
- 鐢ㄥ畾鍒?DOM 鎻愬彇鎷垮埌楂樿川閲?candidates
- 鐢?shared extractor 鍋氬厹搴?- 鎸夐渶鐢?`refineExtraction()` 琛ラ綈杞婚噺澶栭儴淇″彿
- 鐢?diagnostics 淇濊瘉鍚庣画鍙淮鎶ゆ€?
杩欐瘮姣忔浠庨浂鍐欎竴涓复鏃惰剼鏈紡 extractor锛屾洿瀹规槗鎵╁睍锛屼篃鏇村鏄撴帓鏌ラ棶棰樸€?
