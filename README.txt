さくらの全国リスナーMAP

まず admin.html と display.html を「同じブラウザ」で開いてください。
admin.html:
  都道府県名（漢字またはひらがな）を検索して ＋1 / −1。
display.html:
  配信に見せる画面です。制覇数、全国合計、各都道府県人数が表示されます。

重要:
この試作版はブラウザの localStorage に保存します。
そのため、admin.html と display.html を file:// で直接開いた場合、
ブラウザによってはファイルごとに保存領域が分かれ、同期しない場合があります。

確実に同期する方法:
1. Macのターミナルを開く
2. このフォルダに移動
3. python3 -m http.server 8765
4. Safari/Chromeで
   http://localhost:8765/admin.html
   http://localhost:8765/display.html
   を開く

OBSへ載せる場合も display.html の localhost URL をブラウザソースに指定します。

色:
0人 = グレー
1〜4人 = 薄い桜
5〜9人 = 桜
10人以上 = 濃い桜

※現在の地図は「位置関係が分かるタイル型日本地図」の試作版です。
