/*
 * Author: Maciej Gierej
 * https://github.com/MakG10/jquery-memegenerator
 */
(function($){
	
	var i18n = {
		topTextPlaceholder: "TOP TEXT",
		bottomTextPlaceholder: "BOTTOM TEXT",
		
		addTextbox: "Add Textbox",
		advancedSettings: "Advanced Settings",
		toolbox: "Toolbox",
		
		optionCapitalLetters: "Use only capital letters",
		optionDragResize: "Enable dragging and resizing textboxes",
		optionDrawingAboveText: "Show drawing above text",

		drawingStart: "Draw",
		drawingStop: "Stop drawing",
		drawingErase: "Erase",
	};
	
	var MemeGenerator = function(element, options){
		var MG = this;
		
		this.settings = $.extend(true, {}, {
			defaultTextStyle: {
				color: "#FFFFFF",
				size: 42,
				lineHeight: 1.2,
				font: "Impact, Arial",
				style: "normal",
				forceUppercase: true,
				
				borderColor: "#000000",
				borderWidth: 2,
			},
			
			defaultDrawingStyle: {
				color: "#FF0000",
				lineWidth: 10,
			},
			
			minFontSize: 1,
			maxFontSize: 128,
			minBorderWidth: 0,
			maxBorderWidth: 10,
			
			fontSizeStep: 1,
			borderWidthStep: 1,
			
			captions: [],
			
			previewMode: "canvas", // css, canvas
			outputFormat: "image/png",
			
			editingEnabled: true,
			dragResizeEnabled: true,
			drawingAboveText: true,
			showAdvancedSettings: true,
			colorPicker: null,
			
			wrapperClass: "mg-wrapper",
			toolboxSelector: null,
			layout: "vertical",
			useBootstrap: false,
			useWordpressStyle: false,
			
			// Events
			onLayerChange: function(layerName){ return true; },
			onNewTextBox: function(textBox){ return true; },
			onInit: function(){ return true; }
		}, options);
		
		// Options possible to be overwritten by user
		this.userSettings = {
			forceUppercase: MG.settings.defaultTextStyle.forceUppercase,
			dragResizeEnabled: MG.settings.dragResizeEnabled,
			drawingAboveText: MG.settings.drawingAboveText,
		};
		
		this.element = element;
		this.wrapper = null;
		this.canvasContainer = null;
		this.helpersContainer = null;
		this.canvasLayers = [];
		
		this.originalSize = [];
		this.scale = 1.0;

		this.initialized = false;
		
		// ===============
		// PUBLIC METHODS
		// ===============
		
		this.save = function(){
			return MG.canvas.save().toDataURL(MG.settings.outputFormat);
		};
		
		this.saveCanvas = function(){
			return MG.canvas.save();
		};
		
		this.download = function(filename){
			if(typeof filename === 'undefined') filename = 'image.png';

			var downloadLink = $("<a></a>").attr("href", this.save()).attr("download", filename).appendTo(MG.wrapper);
			downloadLink[0].click();
			
			downloadLink.remove();
		};

		this.serialize = function(){
			return JSON.stringify(MG.getLayersData());
		};

		this.deserialize = function(json){
			var layers = JSON.parse(json);

			var newLayers = [];
			MG.canvasLayers.forEach(function(layerName, index) {
				var layer = MG.wrapper.find("[data-layer='" + layerName + "']");

				if(MG.getLayerType(layer))
				{
					layer.remove();

					var helper = MG.wrapper.find("[data-target-layer='" + layerName + "']");
					helper.remove();

					return;
				}

				newLayers.push(layerName);
			});

			MG.canvasLayers = newLayers;

			layers.reverse().forEach(function(layer){
				if(layer.type == 'text')
				{
					MG.ui.createTextBox("", null, layer).prependTo(MG.wrapper.find('.mg-controls'));
				}
			});

			MG.events.onLayerChange();
		};

		this.destroy = function(){
			this.element.insertAfter(this.wrapper);
			this.element.off('load.mg');

			this.wrapper.remove();
		};
		
		
		// ===============
		// PRIVATE METHODS
		// ===============
		
		this.init = function(){
			element.wrap('<div class="mg-wrapper"><div class="mg-image"></div></div>');
			
			MG.wrapper = element.parent().parent();
			MG.canvasContainer = $('<div class="mg-canvas"></div>').appendTo(MG.wrapper.find("> .mg-image"));
			MG.helpersContainer = $('<div class="mg-helpers"></div>').appendTo(MG.wrapper.find("> .mg-image"));
			
			if(MG.settings.layout == "horizontal") MG.wrapper.addClass("mg-horizontal-layout");
			
			if(MG.settings.previewMode == "css") MG.cssPreview.enable();
 
			$("<img>")
				.attr("src", element.attr("src"))
				.on('load', function(){
					MG.originalSize[0] = this.width;
					MG.originalSize[1] = this.height;
					
					MG.scale = element.width() / MG.originalSize[0];
					
					if(MG.settings.editingEnabled)
					{
						MG.wrapper.append(MG.ui.createControls());
					}
					
					// Set default captions if any
					MG.settings.captions.forEach(function(caption, index){
						var textbox = MG.wrapper.find(".mg-textbox-text").eq(index);
						
						if(textbox.length == 0)
						{
							textbox = MG.ui.createTextBox("", "center center").insertAfter(MG.wrapper.find(".mg-controls .mg-textbox").last()).find(".mg-textbox-text");
						}
						
						if(MG.userSettings.forceUppercase)
						{
							caption = MG.ui._strtoupper(caption);
						}
						
						textbox.attr("value", caption);
						textbox.attr("data-text", caption);
						textbox.trigger("change");
					});
					
					if(MG.settings.useBootstrap)
					{
						MG.ui.bootstrapify();
					}
					else if(MG.settings.useWordpressStyle)
					{
						MG.ui.wordpressify();
					}

					MG.initialized = true;
					MG.settings.onInit.call(MG);
				});
				
			$(window).on("resize", function(){
				MG.scale = element.width() / MG.originalSize[0];
				
				MG.events.onLayerChange();
			});

			// Handling change of the src attribute
			element.on('load.mg', function(){
				if(!MG.initialized) return;

				MG.originalSize[0] = this.width;
				MG.originalSize[1] = this.height;

				MG.scale = element.width() / MG.originalSize[0];

				MG.ui.resizeHelpers();
				MG.events.onLayerChange();
			});
		};
		
		this.ui = {
			createControls: function(){
				var controls = $('<div class="mg-controls"></div>');
				controls.append(MG.ui.createTextBox(i18n.topTextPlaceholder, "top center"));
				controls.append(MG.ui.createTextBox(i18n.bottomTextPlaceholder, "bottom center"));
				
				// Add extra textbox button
				var addTextboxButton = $('<a href="#" class="mg-add-textbox">' + i18n.addTextbox + '</a>').appendTo(controls);
				$(addTextboxButton).click(function(e){
					e.preventDefault();
					
					var newTextbox = MG.ui.createTextBox("", "center center").insertAfter(controls.find(".mg-textbox").last());
					
					if(MG.settings.useBootstrap)
					{
						MG.ui.bootstrapify();
					}
					else if(MG.settings.useWordpressStyle)
					{
						MG.ui.wordpressify();
					}
					
					newTextbox.find("input[type=text]").first().focus();
					
					MG.settings.onNewTextBox.call(MG, newTextbox);
				});
				
				// Advanced settings
				var advancedSettingsButton = $('<a href="#" class="mg-advanced-settings-toggle">' + i18n.advancedSettings + '</a>').appendTo(controls);
				var advancedSettings = $('<div class="mg-advanced-settings"></div>').appendTo(controls).hide();
				
				// -- Force uppercase option
				advancedSettings.append(
					$('<div class="option"></div>')
						.append($('<input type="checkbox" class="mg-option-uppercase">'))
						.append($('<label>' + i18n.optionCapitalLetters + '</label>'))
				);
				controls.find(".mg-option-uppercase").prop("checked", MG.userSettings.forceUppercase);
				
				controls.find(".mg-option-uppercase").change(function(e){
					e.preventDefault();
					
					MG.userSettings.forceUppercase = $(this).is(":checked");
					
					if(MG.userSettings.forceUppercase)
					{
						controls.find(".mg-textbox-text").css("textTransform", "uppercase");
						
						controls.find(".mg-textbox-text").each(function(){
							$(this).val(MG.ui._strtoupper($(this).val()));
						});
						
						MG.events.onLayerChange();
					} else {
						controls.find(".mg-textbox-text").css("textTransform", "none");
					}
				});
				
				// -- Drag & Resize option
				advancedSettings.append(
					$('<div class="option"></div>')
						.append($('<input type="checkbox" class="mg-option-dragresize">'))
						.append($('<label>' + i18n.optionDragResize + '</label>'))
				);
				controls.find(".mg-option-dragresize").prop("checked", MG.userSettings.dragResizeEnabled);
				
				controls.find(".mg-option-dragresize").change(function(e){
					e.preventDefault();
					
					MG.userSettings.dragResizeEnabled = $(this).is(":checked");
					
					MG.ui.destroyPositionHelpers();
					if(MG.userSettings.dragResizeEnabled)
					{
						controls.find(".mg-textbox").each(function(){
							MG.ui.createPositionHelper($(this));
						});
					}
				});
				
				// -- Drawing and text - layers order
				advancedSettings.append(
					$('<div class="option"></div>')
						.append($('<input type="checkbox" class="mg-option-drawing-above-text">'))
						.append($('<label>' + i18n.optionDrawingAboveText + '</label>'))
				);
				controls.find(".mg-option-drawing-above-text").prop("checked", MG.userSettings.dragResizeEnabled);
				
				controls.find(".mg-option-drawing-above-text").change(function(e){
					e.preventDefault();
					
					MG.userSettings.drawingAboveText = $(this).is(":checked");
					
					if(MG.userSettings.drawingAboveText)
					{
						MG.wrapper.find(".mg-canvas canvas, .mg-css-preview").css("zIndex", 3);
						MG.wrapper.find(".mg-canvas, .mg-canvas .mg-drawing-layer").css("zIndex", 4);
					} else {
						MG.wrapper.find(".mg-canvas canvas, .mg-css-preview").css("zIndex", 4);
						MG.wrapper.find(".mg-canvas, .mg-canvas .mg-drawing-layer").css("zIndex", 3);
					}
				});
				
				$(advancedSettingsButton).click(function(e){
					e.preventDefault();
					
					advancedSettings.slideToggle(200);
					advancedSettingsButton.toggleClass("active");
				});
				
				
				// Toolbox
				var toolbox;
				
				if(MG.settings.toolboxSelector == null)
				{
					var toolboxButton = $('<a href="#" class="mg-toolbox-toggle">' + i18n.toolbox + '</a>').appendTo(controls);
					var toolbox = $('<div class="mg-toolbox"></div>').appendTo(controls).hide();
					
					$(toolboxButton).click(function(e){
						e.preventDefault();
						
						toolbox.slideToggle(200);
						toolboxButton.toggleClass("active");
					});
				} else {
					if(MG.settings.toolboxSelector instanceof jQuery)
					{
						toolbox = MG.settings.toolboxSelector;
					} else {
						toolbox = $(MG.settings.toolboxSelector);
					}
				}

				toolbox.append('<div class="mg-toolbox-item"><button class="mg-drawing-toggle">' + i18n.drawingStart + '</button></div>');
				toolbox.append('<div class="mg-toolbox-item"><input type="text" class="colorpicker" value="' + MG.settings.defaultDrawingStyle.color + '"></div>');
				toolbox.append('<div class="mg-toolbox-item"><input type="number" class="mg-drawing-line-width" value="' + MG.settings.defaultDrawingStyle.lineWidth + '"></div>');
				toolbox.append('<div class="mg-toolbox-item"><button class="mg-drawing-erase">' + i18n.drawingErase + '</button></div>');
				
				toolbox.find(".mg-drawing-toggle").click(function(){
					$(this).toggleClass("active");
					
					if($(this).hasClass("active"))
					{
						$(this).html(i18n.drawingStop);
						
						MG.drawing.enable();
					} else {
						$(this).html(i18n.drawingStart);
						
						MG.drawing.disable();
					}
				});
				
				toolbox.find(".mg-drawing-line-width").on("change keyup", function(){
					MG.drawing.lineWidth = parseInt($(this).val(), 10);
				});
				
				toolbox.find(".mg-drawing-erase").click(function(){
					MG.drawing.erase();
				});
				
				toolbox.find(".colorpicker").change(function(){
					MG.drawing.color = $(this).attr("value");
				});
				
				MG.ui._bindColorpicker(toolbox.find(".colorpicker"));

				return controls;
			},
 
			createTextBox: function(placeholder, position, params){
				if(typeof params === 'undefined') params = {};

				params = $.extend({
					layerName: "layer" + (MG.canvasLayers.length + 1),
					text: "",
					x: 0,
					y: 0,
					maxWidth: MG.originalSize[0],
					fontSize: MG.settings.defaultTextStyle.size,
					color: MG.settings.defaultTextStyle.color,
					borderColor: MG.settings.defaultTextStyle.borderColor,
					borderWidth: MG.settings.defaultTextStyle.borderWidth
				}, params);
				params.height = Math.round(MG.settings.defaultTextStyle.lineHeight * params.fontSize);

				var layerName = params.layerName;
				
				var boxWidth = params.maxWidth;
				var boxHeight = params.height;
				var boxPosition = position === null ? [params.x, params.y]
					: MG.ui._getBoxCoordinates(position, params.maxWidth, params.height);
				
				var box = $('<div class="mg-textbox" data-layer="' + layerName + '" data-x="' + boxPosition[0] + '" data-y="' + boxPosition[1] + '" data-width="' + boxWidth + '" data-height="' + boxHeight + '"></div>');
				box.append($('<input type="text" class="mg-textbox-text" placeholder="' + placeholder + '" data-text="' + params.text + '" value="' + params.text + '">'));
				box.append($('<input type="number" class="mg-textbox-size" value="' + params.fontSize + '" step="' + MG.settings.fontSizeStep + '" min="' + MG.settings.minFontSize + '" max="' + MG.settings.maxFontSize + '">'));
				
				if(MG.userSettings.forceUppercase)
				{
					box.find(".mg-textbox-text").css("textTransform", "uppercase");
				}
				
				if(MG.settings.colorPicker != false)
				{
					box.append('<input type="text" class="mg-textbox-text-color colorpicker" value="' + params.color + '">');
					box.append('<input type="text" class="mg-textbox-border-color colorpicker" value="' + params.borderColor + '">');
					box.find(".colorpicker").wrap('<div class="colorpickerContainer"></div>');
					
					MG.ui._bindColorpicker(box.find(".colorpicker"));
				}
				
				box.append($('<input type="number" class="mg-textbox-border-width" value="' + params.borderWidth + '" step="' + MG.settings.borderWidthStep + '" min="' + MG.settings.minBorderWidth + '" max="' + MG.settings.maxBorderWidth + '">'));
				
				// Canvas Layer
				MG.canvasLayers.push(layerName);
				
				// Bind events
				box.find(".mg-textbox-text, .mg-textbox-size, .mg-textbox-border-width").on("change keyup", function(){
					if(MG.userSettings.forceUppercase)
					{
						$(this).attr("data-text", MG.ui._strtoupper($(this).val()));
					}
					
					MG.events.onLayerChange(layerName);
				});
				
				// Position helper
				if(MG.userSettings.dragResizeEnabled)
				{
					MG.ui.createPositionHelper(box);
				}
				
				return box;
			},
 
			createPositionHelper: function(box){
				var layerName = box.data('layer');
				var helper = $('<div class="draggable resizable" data-target-layer="' + layerName + '"></div>').appendTo(MG.helpersContainer);
				helper.css({left: box.attr("data-x") * MG.scale, top: box.attr("data-y") * MG.scale, width: box.attr("data-width") * MG.scale, height: box.attr("data-height") * MG.scale});
				
				helper.draggable({
					containment: MG.wrapper.find("> .mg-image > img"),
					drag: function(event, ui){
						var layer = MG.wrapper.find("[data-layer='" + layerName + "']");
						layer.attr("data-x", ui.position.left * (1 / MG.scale));
						layer.attr("data-y", ui.position.top * (1 / MG.scale));
						
						MG.events.onLayerChange();
					}
				});
				
				helper.resizable({
					containment: MG.wrapper.find("> .mg-image > img"),
					resize: function(event, ui){
						var layer = MG.wrapper.find("[data-layer='" + layerName + "']");
						layer.attr("data-width", ui.size.width * (1 / MG.scale));
						layer.attr("data-height", ui.size.height * (1 / MG.scale));
						
						MG.events.onLayerChange();
					}
				});

				//helper.on('click', function(e){
				//	var layer = MG.wrapper.find("[data-layer='" + layerName + "']");
				//	var input = layer.find('.mg-textbox-text');
				//	var length = input.val().length;
				//
				//	input.select();
				//	input[0].setSelectionRange(length, length);
				//});
			},
 
			resizeHelpers: function(){
				MG.helpersContainer.find("> div").each(function(){
					var layer = MG.wrapper.find("[data-layer='" + $(this).attr("data-target-layer") + "']");
					
					if(layer.attr("data-width"))
					{
						$(this).css("width", parseInt(layer.attr("data-width"), 10) * MG.scale);
					}
					
					if(layer.attr("data-height"))
					{
						$(this).css("height", parseInt(layer.attr("data-height"), 10));
						$(this).resizable("option", "minHeight", parseInt(layer.attr("data-height"), 10));
						$(this).resizable("option", "maxHeight", parseInt(layer.attr("data-height"), 10));
					}
					
					if(layer.attr("data-x") && layer.attr("data-y"))
					{
						$(this).css({left: layer.attr("data-x") * MG.scale, top: layer.attr("data-y") * MG.scale});
					}
					
					if(parseInt($(this).css("top"), 10) + $(this).outerHeight() > MG.helpersContainer.height())
					{
						var newTop = MG.helpersContainer.outerHeight() - $(this).outerHeight();
						
						$(this).css("top", newTop);
						layer.attr("data-y", newTop * (1 / MG.scale));
					}
				});
			},
 
			destroyPositionHelpers: function(){
				MG.helpersContainer.find("> div").remove();
			},
 
			bootstrapify: function(){
				var controls = MG.wrapper.find(".mg-controls");
				
				if(!MG.wrapper.hasClass("usingBootstrap"))
				{
					controls.wrapInner('<div class="container-fluid"></div>');
				}
				
				MG.wrapper.addClass("usingBootstrap");
				
				controls.find(".mg-textbox").each(function(){
					if(!$(this).hasClass("row"))
					{
						$(this).addClass("row");
						$(this).find(".mg-textbox-text").addClass("form-control").wrap($("<div></div>").addClass("col-md-4"));
						$(this).find(".mg-textbox-size").addClass("form-control").wrap($("<div></div>").addClass("col-md-2"));
						$(this).find(".mg-textbox-border-width").addClass("form-control").wrap($("<div></div>").addClass("col-md-2"));
						$(this).find(".colorpicker").addClass("form-control")
						$(this).find(".colorpickerContainer").addClass("col-md-2");
						$(this).find(".colorpickerReplacer").addClass("btn btn-default");
					}
				});
				
				if(!controls.find(".mg-add-textbox").hasClass("btn"))
				{
					controls.find(".mg-add-textbox").addClass("btn btn-default btn-block").wrap($("<div></div>").addClass("row"));
				}
				
				if(!controls.find(".mg-advanced-settings-toggle").hasClass("btn"))
				{
					controls.find(".mg-advanced-settings-toggle, .mg-toolbox-toggle").addClass("btn btn-primary btn-block").wrap($("<div></div>").addClass("row"));
					controls.find(".mg-advanced-settings, .mg-toolbox").addClass("row");
// 					controls.find(".mg-advanced-settings .option").addClass("row");
					controls.find(".mg-advanced-settings .option input").wrap('<div class="col-md-1"></div>');
					controls.find(".mg-advanced-settings .option label").wrap('<div class="col-md-11"></div>');
				}
				
				if(!controls.find(".mg-drawing-toggle").hasClass("btn"))
				{
					controls.find(".mg-drawing-toggle, .mg-drawing-erase").addClass("btn btn-default btn-block");
					controls.find(".mg-toolbox-item").addClass("col-md-3");
					
				}
			},
 
			wordpressify: function(){
				var controls = MG.wrapper.find(".mg-controls");
				
				MG.wrapper.addClass("usingWordpress");
				
				if(!controls.find(".mg-add-textbox").hasClass("button"))
				{
					controls.find(".mg-add-textbox").addClass("button button-secondary");
				}
				
				if(!controls.find(".mg-advanced-settings-toggle").hasClass("button"))
				{
					controls.find(".mg-advanced-settings-toggle, .mg-toolbox-toggle").addClass("button button-primary");
				}
				
				if(!controls.find(".mg-drawing-toggle").hasClass("button"))
				{
					controls.find(".mg-drawing-toggle, .mg-drawing-erase").addClass("button button-secondary");
					
				}
			},
 
			_bindColorpicker: function(selector){
				if(MG.settings.colorPicker == null && $.isFunction($.fn.spectrum))
				{
					var changeEvent = function(color){
						$(this).val(color.toHexString());
						$(this).attr("value", color.toHexString());
						$(this).trigger("change");
						
						MG.events.onLayerChange($(this).parent().data("layer"));
					};
					
					selector.spectrum({
						replacerClassName: "colorpickerReplacer",
						change: changeEvent,
						move: changeEvent
					});
				}
				else if(MG.settings.colorPicker == null)
				{
					selector.on("change keyup", function(){
						$(this).attr("value", $(this).val());
						MG.events.onLayerChange($(this).parent().data("layer"));
					});
				} else {
					MG.settings.colorPicker.call(this, MG, selector);
				}
			},
 
			_getBoxCoordinates: function(position, boxWidth, boxHeight){
				var posDesc = position.split(" ");
				
				var coordinates = [];
				if(posDesc.length == 2)
				{
					switch(posDesc[0])
					{
						case "center":
							coordinates[1] = parseInt(MG.originalSize[1] / 2, 10);
							break;
							
						case "bottom":
							coordinates[1] = MG.originalSize[1] - boxHeight;
							break;
							
						case "top":
						default:
							coordinates[1] = 0;
							break;
					}
					
					switch(posDesc[1])
					{
						case "center":
							coordinates[0] = parseInt(MG.originalSize[0] / 2, 10) - parseInt(boxWidth / 2, 10);
							break;
							
						case "right":
							coordinates[0] = MG.originalSize[0] - boxWidth;
							break;
							
						case "left":
						default:
							coordinates[0] = 0;
							break;
					}
				} else {
					coordinates[0] = coordinates[1] = 0;
				}
				
				return coordinates;
			},
 
			_normalizePosition: function(value){
				return value * (1 + 1 - MG.scale);
			},
			
			_strtoupper: function(text){
				return text.toUpperCase();
			}
		};

		this.getLayersData = function(){
			var layers = [];

			MG.canvasLayers.forEach(function(layerName){
				var layer = MG.wrapper.find("[data-layer='" + layerName + "']");
				var type = MG.getLayerType(layer);

				switch(type)
				{
					case 'text':
						layers.push({
							type: type,
							name: layerName,
							text: layer.find(".mg-textbox-text").attr("data-text"),
							x: layer.attr("data-x"),
							y: layer.attr("data-y"),
							maxWidth: layer.attr("data-width"),
							fontSize: layer.find(".mg-textbox-size").val(),
							lineHeight: MG.settings.defaultTextStyle.lineHeight,
							font: MG.settings.defaultTextStyle.font,
							color: layer.find(".mg-textbox-text-color").val(),
							borderColor: layer.find(".mg-textbox-border-color").attr("value"),
							borderWidth: layer.find(".mg-textbox-border-width").val()
						});
						return;

					// TODO: serialization of drawing?
					case 'drawing':
						layers.push({
							type: type
						});
						return;

					default:
						return;
				}
			});

			return layers;
		};

		this.getLayerType = function(layer) {
			if(layer.hasClass('mg-textbox'))
			{
				return 'text';
			}

			if(layer.hasClass('mg-drawing-layer'))
			{
				return 'drawing';
			}

			return null;
		};
		
		this.canvas = {
			drawLayers: function(canvasScale){
				if(typeof canvasScale == "undefined") canvasScale = MG.scale;
 
				MG.canvasContainer.find("canvas:not(.mg-drawing-layer)").remove("");

				MG.getLayersData().forEach(function(layer){
					layerElement = MG.wrapper.find("[data-layer='" + layer.name + "']");

					if(layer.type == 'text')
					{
						var textCanvas = MG.canvas.drawText(
							layer.text,
							layer.x * canvasScale,
							layer.y * canvasScale,
							layer.maxWidth * canvasScale,
							layer.fontSize * canvasScale,
							layer.lineHeight,
							layer.font,
							layer.color,
							layer.borderColor,
							layer.borderWidth * canvasScale,
							canvasScale
						);
						MG.canvasContainer.append(textCanvas);

						var textHeight = textCanvas.attr("data-text-lines") * layer.fontSize;
						layerElement.attr("data-height", Math.round(MG.settings.defaultTextStyle.lineHeight * textHeight));
					}
				});
				
				if(MG.userSettings.drawingAboveText)
				{
					MG.canvasContainer.find("canvas.mg-drawing-layer").remove().insertAfter(MG.canvasContainer.find(":last"));
				} else {
					MG.canvasContainer.find("canvas.mg-drawing-layer").remove().insertBefore(MG.canvasContainer.find(":first"));
				}
			},
			
			drawText: function(text, x, y, maxWidth, fontSize, lineHeight, font, color, borderColor, borderWidth, scale){
				if(typeof scale == "undefined") scale = 1.0;
 
				var canvasElement = $('<canvas></canvas>').attr("width", MG.originalSize[0] * scale).attr("height", MG.originalSize[1] * scale);
				var canvasContext = canvasElement[0].getContext("2d");
				
				// Font settings
				canvasContext.font = fontSize + "px " + font;
				canvasContext.textAlign = "center";
				canvasContext.fillStyle = color;
				canvasContext.strokeStyle = borderColor
				canvasContext.lineWidth = borderWidth;
				
				var posX = parseInt(x, 10) + parseInt(maxWidth, 10) / 2;
				var posY = parseInt(y, 10) + parseInt(fontSize, 10);
				var lineHeight = fontSize * parseFloat(lineHeight);
				
				var lines = MG.canvas._wrapText(canvasContext, text, maxWidth);
				lines.forEach(function(line, index){
					canvasContext.fillText(line, posX, posY - borderWidth + (lineHeight - fontSize) / 2 + index * lineHeight);
					canvasContext.strokeText(line, posX, posY - borderWidth + (lineHeight - fontSize) / 2 + index * lineHeight);
				});
				
				canvasElement.attr("data-text-lines", lines.length);
				
				return canvasElement;
			},
 
			save: function(){
				var image = $('<canvas></canvas>').attr("width", MG.originalSize[0]).attr("height", MG.originalSize[1])[0];
				var imageContext = image.getContext("2d");
				
				imageContext.drawImage(element[0], 0, 0);
				
				MG.canvas.drawLayers(1.0);
				
				MG.canvasContainer.find("canvas").each(function(){  
					imageContext.drawImage(this, 0, 0, MG.originalSize[0], MG.originalSize[1]);
				});
				
				// Restore scaled layers in preview box
				if(MG.settings.previewMode == "canvas")
				{
					MG.canvas.drawLayers();
				} else {
					MG.canvas.clear();
				}
				
				return image;
			},
 
			clear: function(){
				MG.canvasContainer.find("canvas:not(.mg-drawing-layer)").remove("");
			},
 
			_wrapText: function(ctx, text, maxWidth){
				var words = text.split(" ");
				var lines = [];
				var currentLine = words[0];

				for(var i = 1; i < words.length; i++) {
					var word = words[i];
					var width = ctx.measureText(currentLine + " " + word).width;
					
					if(width < maxWidth)
					{
						currentLine += " " + word;
					} else {
						lines.push(currentLine);
						currentLine = word;
					}
				}
				
				lines.push(currentLine);
				return lines;
			}
		};
		
		this.cssPreview = {
			enable: function(){
				MG.wrapper.find("> .mg-image").append('<div class="mg-css-preview"></div>');
			},
 
			disable: function(){
				MG.wrapper.find("div.mg-css-preview").remove();
			},
 
			drawLayers: function(){
				var cssPreviewContainer = MG.wrapper.find(".mg-css-preview");
				cssPreviewContainer.find("div").remove();

				MG.getLayersData().forEach(function(layer){
					layerElement = MG.wrapper.find("[data-layer='" + layer.name + "']");

					if(layer.type == 'text')
					{
						var textElement = MG.cssPreview.drawText(
							layer.text,
							layer.x * MG.scale,
							layer.y * MG.scale,
							layer.maxWidth * MG.scale,
							layer.fontSize * MG.scale,
							layer.lineHeight * MG.scale,
							layer.font,
							layer.color,
							layer.borderColor,
							layer.borderWidth * MG.scale
						);
						cssPreviewContainer.append(textElement);

						layerElement.attr("data-height", Math.round(textElement.height()));
					}
				});
			},
 
			drawText: function(text, x, y, maxWidth, fontSize, lineHeight, font, color, borderColor, borderWidth){
				var textElement = $("<div></div>").html(text);
				textElement.css({
					left: x,
					top: y,
					width: maxWidth,
					minHeight: fontSize,
					fontSize: fontSize,
					fontFamily: font,
					color: color,
					textAlign: "center",
					lineHeight: parseFloat(lineHeight),
					textShadow: (function(borderWidth, borderColor){
						var textShadow = "";
						[[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function(direction, index){
							textShadow += direction[0] * borderWidth + "px " + direction[1] * borderWidth + "px 0 " + borderColor;
							if(index != 3) textShadow += ",";
						});
						
						return textShadow;
					}(borderWidth, borderColor))
				});
				
				return textElement;
			}
		};
 
		this.drawing = {
			container: null,
			canvas: null,
			enabled: false,
			flag: false,
			prevX: 0,
			currX: 0,
			prevY: 0,
			currY: 0,

			color: MG.settings.defaultDrawingStyle.color,
			lineWidth: MG.settings.defaultDrawingStyle.lineWidth,
			
			enable: function(){
				if(MG.drawing.canvas == null)
				{
					MG.drawing.container = $('<div class="mg-drawing"></div>').appendTo(MG.wrapper.find("> .mg-image"));
					
					var drawingCanvas = $('<canvas class="mg-drawing-layer"></canvas>').attr("width", MG.drawing.container.width()).attr("height", MG.drawing.container.height()).appendTo(MG.canvasContainer);
					MG.drawing.canvas = drawingCanvas[0];
					MG.drawing.initEvents();
				}
				
				MG.drawing.enabled = true;
				MG.drawing.container.show();
			},

			disable: function(){
				MG.drawing.enabled = false;
				MG.drawing.container.hide();
			},
			
			initEvents: function(){
				MG.drawing.container[0].addEventListener("mousemove", function (e) {
					MG.drawing.handleAction("move", e)
				}, false);
				
				MG.drawing.container[0].addEventListener("mousedown", function (e) {
					MG.drawing.handleAction("down", e)
				}, false);
				
				MG.drawing.container[0].addEventListener("mouseup", function (e) {
					MG.drawing.handleAction("up", e)
				}, false);
				
				MG.drawing.container[0].addEventListener("mouseout", function (e) {
					MG.drawing.handleAction("out", e)
				}, false);
			},

			draw: function(){
				var context = MG.drawing.canvas.getContext("2d");
				
				context.beginPath();
				context.moveTo(MG.drawing.prevX, MG.drawing.prevY);
				context.lineTo(MG.drawing.currX, MG.drawing.currY);
				context.strokeStyle = MG.drawing.color;
				context.lineWidth = MG.drawing.lineWidth;
				context.stroke();
				context.closePath();
			},

			erase: function(){
				var context = MG.drawing.canvas.getContext("2d");
				
				context.clearRect(0, 0, MG.drawing.canvas.width, MG.drawing.canvas.height);
			},

			handleAction: function(action, event){
				if(MG.drawing.enabled)
				{
					var context = MG.drawing.canvas.getContext("2d");
					
					if(action == "down")
					{
						MG.drawing.prevX = MG.drawing.currX;
						MG.drawing.prevY = MG.drawing.currY;
						MG.drawing.currX = event.clientX - MG.drawing.container.offset().left;
						MG.drawing.currY = event.clientY - MG.drawing.container.offset().top;

						MG.drawing.flag = true;
						
						context.beginPath();
						context.fillStyle = MG.drawing.color;
						context.fillRect(MG.drawing.currX, MG.drawing.currY, 2, 2);
						context.closePath();
					}
					
					else if(action == "up" || action == "out")
					{
						MG.drawing.flag = false;
					}
					
					else if(action == "move")
					{
						if(MG.drawing.flag)
						{
							MG.drawing.prevX = MG.drawing.currX;
							MG.drawing.prevY = MG.drawing.currY;
							MG.drawing.currX = event.clientX - MG.drawing.container.offset().left;
							MG.drawing.currY = event.clientY - MG.drawing.container.offset().top;
							MG.drawing.draw();
						}
					}
				}
			}
		};
		
		this.events = {
			onLayerChange: function(layerName){
				if(MG.settings.previewMode == "canvas")
				{
					MG.canvas.drawLayers();
				}
				else if(MG.settings.previewMode == "css")
				{
					MG.cssPreview.drawLayers();
				}
				
				MG.ui.resizeHelpers();
				
				MG.settings.onLayerChange.call(MG, layerName);
			},
		};
	};
	
	
	$.fn.memeGenerator = function(methodOrOptions){
		
		var method = (typeof methodOrOptions === 'string') ? methodOrOptions : undefined;

		if(method)
		{
			var memeGeneratorPlugins = [];
			var args = (arguments.length > 1) ? Array.prototype.slice.call(arguments, 1) : undefined;
			var results = [];
			
			if(method == "i18n")
			{
				$.extend(i18n, args[1]);
				return;
			}

			this.each(function(){
				var $el          = $(this);
				var memeGeneratorPlugin = $el.data('memeGenerator');

				memeGeneratorPlugins.push(memeGeneratorPlugin);
			});
			
			this.each(function(index){
				var memeGeneratorPlugin = memeGeneratorPlugins[index];

				if(!memeGeneratorPlugin)
				{
					results.push(undefined);
					return;
				}

				if(typeof memeGeneratorPlugin[method] === 'function')
				{
					var result = memeGeneratorPlugin[method].apply(memeGeneratorPlugin, args);
					results.push(result);
				} else {
					console.warn('$.fn.memeGenerator: Undefined method "' + method + '"');
				}
			});

			return (results.length > 1) ? results : results[0];
		} else {
			var options = (typeof methodOrOptions === 'object') ? methodOrOptions : undefined;

			return this.each(function(){
				var $el          = $(this);
				var memeGeneratorPlugin = new MemeGenerator($el, options);
				memeGeneratorPlugin.init();

				$el.data('memeGenerator', memeGeneratorPlugin);
			});
		}
		
	};
}(jQuery));
