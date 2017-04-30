# jQuery Meme Generator
- [About](#about)
- [Features](#features)
- [Demo](#demo)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Internationalization](#internationalization)
- [Saving an image on server side](#saving-an-image-on-server-side)
	- [PHP](#php)
	- [Python w/ Django](#python-w-django)
- [Changelog](#changelog)
- [License](#license)

## About
Meme Generator is a jQuery plugin allowing easily creating images with captions (memes).

Written by Maciej Gierej - http://makg.eu

## Features
- Seperate styling for each text box
- Drawing tool with customizable color and size
- Two preview modes - canvas and CSS - latter being more suitable for slow machines
- Saving image as data url or canvas
- Predefining captions

## Demo
http://makg10.github.io/jquery-meme-generator/

## Requirements
- jQuery 1.11+
- jQuery UI 1.11+ (draggable and resizeable plugins)
- Spectrum (optional)

## Installation

### (optional) Installing npm package
You can install jQuery Meme Generator using npm:
```
npm install --save jquery-meme-generator
```

### Step 1 - Include required files
```html
<!-- jQuery 1.11.3 -->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>

<!-- jQuery UI 1.11.4 -->
<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js"></script>

<!-- Spectrum plugin (optional) -->
<script src="/js/spectrum.js"></script>

<!-- Meme Generator plugin -->
<script type="text/javascript" src="/js/jquery.memegenerator.min.js"></script>


<!-- jQuery UI CSS file -->
<link rel="stylesheet" type="text/css" href="https://code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css">

<!-- Spectrum CSS file (optional) -->
<link rel="stylesheet" type="text/css" href="/css/spectrum.css">

<!-- Meme Generator CSS file -->
<link rel="stylesheet" type="text/css" href="../dist/jquery.memegenerator.min.css">
```

### Step 2 - Markup
Meme Generator doesn't require any special markup - you can attach the plugin to any `<img>` tag.

```html
<img src="meme.jpg" id="meme">
```

### Step 3 - Attach Meme Generator plugin
Call Meme Generator plugin after you create a target `<img>` element or call it when the DOM is ready.

```javascript
$(document).ready(function(){
	$("#meme").memeGenerator();
});
```

## Configuration

### Options
Property             |Default     |Description
---------------------|------------|-----------
defaultTextStyle     |{<br>color: "#FFFFFF",<br>size: 42,<br>lineHeight: 1.2,<br>font: "Impact, Arial",<br>style: "normal",<br>forceUppercase: true,<br>borderColor: "#000000",<br>borderWidth: 2,<br>}|Default text style properties for all captions. Each text box can be styled seperately by user.
defaultDrawingStyle  |{<br>color: "#FF0000",<br>lineWidth: 10,<br>}|Default drawing style properties.
minFontSize          |1           |Minimum font size the user can set.
maxFontSize          |128         |Maximum font size the user can set.
minBorderWidth       |0           |Minimum border (text stroke) size the user can set.
maxBorderWidth       |10          |Maximum border (text stroke) size the user can set.
fontSizeStep         |1           |Step size for spinner related to the font size.
borderWidthStep      |1           |Step size for spinner related to the text stroke size.
captions             |[]          |Default captions that will show up after plugin initialisation. The first element of the array is the top text, the second is the bottom text and every array element after that is an additional text box positioned in the middle.
previewMode          |canvas      |Preview mode (rendering method). Available options: "canvas", "css". CSS mode is faster on slow machines, but isn't 100% accurate with rendered canvas layers.
outputFormat         |image/png   |Output format of saved canvas. Can be any format supported by HTML5 Canvas.
editingEnabled       |true        |Enables/disables editing. If set to false, the controls don't show at all. You can use it to just present captions defined by you.
dragResizeEnabled    |true        |Enables/disables dragging and resizing text boxes.
drawingAboveText     |true        |Determines whether the drawing should be render above captions (true) or below (false).
showAdvancedSettings |true        |Enables/disables editing advanced settings by user.
colorPicker          |null        |Color picker callback, if you want to use a different color picker. Set to *false* if you want to disable color picker entirely. See an example in the "Custom Color Picker" section below.
wrapperClass         |mg-wrapper  |Class name of the div wrapping the image and all additional elements created by this plugin.
toolboxSelector      |null        |Selector or jQuery object of toolbox container. Use it if you want to have the drawing UI in a different place on the page.
layout               |vertical    |Layout of the meme generator. Available options: "vertical", "horizontal".
useBootstrap         |false       |Set to *true* if you want to automatically style meme generator with Bootstrap3. The Bootstrap3 CSS file needs to be included on the page.

### Callbacks
Property             |Default     |Description
---------------------|------------|-----------
`onLayerChange`        |null        |It fires when any layer is changed (re-rendered).
`onNewTextBox`         |null        |It fires when the user creates new text box.
`onInit`              |null        |It fires when the meme generator has been initialized (the source images has been loaded and UI has been created)

#### Example
```javascript
$("img").memeGenerator({
	onInit: function(){
	    this.deserialize('json to deserialize...');
	}
});
```

### Methods
Method name          |Description
---------------------|-----------
save                 |Returns the image with captions as data url string.<br>**Usage:**`$("selector").memeGenerator("save");`
saveCanvas           |Returns the image with captions as a single canvas element.<br>**Usage:**`$("selector").memeGenerator("saveCanvas");`
download             |Generates the image and automatically initiates a download.<br>**Parameters:** filename (optional)<br>__Note:__ file name should have an extension appropriate to outputFormat option (default image/png). Default file name is "image.png".<br>**Usage:** `$("selector").memeGenerator("download", "image.png");`
serialize            |Returns JSON string with all the layers which can be stored and restored later with deserialize method.<br>__Note:__ Currently only text layers are supported, drawings aren't getting serialized.<br>**Usage:** `var json = $("selector").memeGenerator("serialize");`
deserialize          |Restores the layers from the JSON string. If there is missing data from the layers (i.e. no font size), the default values will be used.<br>__Note:__ As of now, you have to make sure to call `deserialize` after the meme generator has been initialized (image has been loaded and controls created). You can use `onInit` event.<br>**Usage:** `$("selector").memeGenerator("deserialize", '[{"type":"text","name":"layer1","text":"TEXT1","x":"0","y":"0","maxWidth":"555","fontSize":"60","lineHeight":1.2,"font":"Impact, Arial","color":"#69aae7","borderColor":"#000000","borderWidth":"6"},{"type":"text","name":"layer2","text":"TEXT2","x":"0","y":"454","maxWidth":"555","fontSize":"42","lineHeight":1.2,"font":"Impact, Arial","color":"#00ff6c","borderColor":"#ff0000","borderWidth":"2"}]');`
destroy              |Destroys the meme generator leaving the source <img> tag intact.

### Custom Color Picker - Example
By default, Meme Generator plugin is using Spectrum as a color picker, if it's included on the page, otherwise it falls back to a simple text input.

You can use a different color picker with "colorPicker" option. It takes a callback function which executes when creating text boxes. Example:

```javascript
$("img").memeGenerator({
	colorPicker: function(mg, selector){
		selector.colorPicker();
		// Other stuff required for your color picker to work
		// selector is a jQuery object with input element(s)
	}
});
```

## Internationalization
To translate UI messages, simply include a proper i18n file after Meme Generator JS file.

```html
<script type="text/javascript" src="/js/jquery.memegenerator.pl.js"></script>
```

If you want to create a new translation, you can see an example in `i18n/jquery.memegenerator.pl.js`.

```javascript
$.fn.memeGenerator("i18n", "pl", {
	topTextPlaceholder: "GÓRNY TEKST",
	bottomTextPlaceholder: "DOLNY TEKST",
	
	addTextbox: "Dodaj pole tekstowe",
	advancedSettings: "Zaawansowane opcje",
	toolbox: "Rysowanie",
	
	optionCapitalLetters: "Używaj tylko wielkich liter",
	optionDragResize: "Włącz interaktywne przemieszczanie i skalowanie pól tekstowych",
	optionDrawingAboveText: "Pokazuj rysunek ponad tekstem",

	drawingStart: "Rysuj",
	drawingStop: "Przestań rysować",
	drawingErase: "Wyczyść",
});
```

## Saving an image on server side
You can easily send an image using AJAX request with generated image data URL as a parameter.

```javascript
<a href="#" id="save">

<script type="text/javascript">
$("#save").click(function(e){
	e.preventDefault();
	
	var imageDataUrl = $("#example-save").memeGenerator("save");
	
	$.ajax({
		url: "/save-img",
		type: "POST",
		data: {image: imageDataUrl},
		dataType: "json",
		success: function(response){
			$("#preview").html(
				$("<img>").attr("src", response.filename)
			);
		}
	});
});
</script>
```

### PHP
```php
<?php
$data = $_POST['image'];

if(preg_match('/data:image\/(gif|jpeg|png);base64,(.*)/i', $data, $matches))
{
	$imageType = $matches[1];
	$imageData = base64_decode($matches[2]);
	
	$image = imagecreatefromstring($imageData);
	$filename = md5($imageData) . '.png';
	
	if(imagepng($image, 'images/' . $filename))
	{
		echo json_encode(array('filename' => '/scripts/images/' . $filename));
	} else {
		throw new Exception('Could not save the file.');
	}
} else {
	throw new Exception('Invalid data URL.');
}
```

### Python w/ Django
```python
import hashlib
import json
import re
from binascii import a2b_base64
from django.http import JsonResponse

def save_img(request):
	if request.method == 'POST':
		data = request.POST.get('image', '')
		
		matches = re.match(r'data:image\/(gif|jpeg|png);base64,(.*)', data)
		
		binary_data = a2b_base64(matches.group(2))
		filename = hashlib.md5(binary_data).hexdigest() + '.png';
		
		fd = open('static/images/' + filename, 'wb')
		fd.write(binary_data)
		fd.close()
		
		return JsonResponse({'filename': request.build_absolute_uri('/static/images/' + filename)})
```

## Changelog

### Version 1.0.4
- New "destroy" method
- Handling dynamic changes of "src" attribute
- Fixed jQuery 3 compatibility issue

### Version 1.0.3
- New serialize and deserialize methods
- Experimental: changing text directly on image
- Filename argument for the public "download" method
- New onInit event

### Version 1.0.2
- New lineHeight param
- Fix: forceUppercase causing text selection problems (issue #3)
- New useWordpressStyle option

### Version 1.0.1
- Added gulp tasks

### Version 1.0
Initial release

## License
Released under the MIT license - http://opensource.org/licenses/MIT
