import zrender from 'zrender';

export interface AnnotationEditorOptions {
  imgUrl: string;
  mode?: AnnotationEditorMode | AnnotationEditorMode[] | undefined;
  select?: (instance: any, data: ObjectData) => void;
}

export interface OptionalAnnotationEditorOptions {
  imgUrl?: string;
  mode?: AnnotationEditorMode | AnnotationEditorMode[] | undefined;
  select?: (instance: any, data: ObjectData) => void;
}

export interface ObjectData {
  type: 'image' | 'rect' | 'polyline',
  style: { [name: string ]: any },
  shape: { [name: string ]: any },
  position: [number, number],
  scale: [number, number],
  rotation: number,
}

export enum AnnotationEditorMode {
  DrawRect = 1,
  DrawPolyline,
  EditObject,
  SelectObject,
  DragWorkspace,
  ScaleWorkspace
}

export default class AnnotationEditor {
  public instance: any;
  public options: AnnotationEditorOptions | OptionalAnnotationEditorOptions = {};
  public workspace: any;
  public image: any;
  public objects: any[] = [];
  public globalStyle = {
    fill: 'transparent',
    stroke: 'red',
    lineWidth: 2,
    strokeNoScale: true
  };

  constructor(public mounted: string | HTMLElement) {
    const root = this.getNode(mounted);
    if (root) {
      this.instance = zrender.init(root, {
        width: root.offsetWidth,
        height: root.offsetHeight
      });
      this.workspace = new zrender.Group({
        position: [0, 0],
        scale: [1, 1]
      });
      this.instance.add(this.workspace);
    }
  }

  private getNode(dom: string | HTMLElement): HTMLElement | null {
    if (typeof dom === 'string') {
      return document.querySelector(dom);
    } else {
      return dom;
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject();
      };
    });
  }

  public async init(options: AnnotationEditorOptions) {
    this.options = options;
    const { imgUrl, mode } = options;
    
    if (imgUrl) {
      await this.drawImage(imgUrl);
    }

    this.setMode(mode);
  }

  private async drawImage(url: string) {
    if (this.image) {
      this.workspace.remove(this.image);
    }
    this.workspace.attr({
      position: [0, 0],
      scale: [1, 1]
    });
    const image = await this.loadImage(url);
    const geo = new zrender.Image({
      style: {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
        image: url
      }
    });
    geo.category = 'backgroundImage';
    this.image = geo;
    this.workspace.add(geo);
  }

  public setModel(model: ObjectData[]) {
    this.objects.forEach(object => {
      this.workspace.remove(object);
    });
    this.objects = [];

    model.forEach(data => {
      const geo = this.toObjectModel(data);
      this.objects.push(geo);
      this.workspace.add(geo);
    });
  }

  public getModel() {
    return this.objects.map(object => this.toObjectData(object));
  }

  private computedShapeXyRange(geo: any) {
    const shape = geo.shape;
    let range = {
      xRange: [0, 0],
      yRange: [0, 0]
    };

    switch (geo.type) {
      case 'rect': {
        range = {
          xRange: [shape.x, shape.x + shape.width],
          yRange: [shape.y, shape.y + shape.height]
        };
        break;
      }
      case 'ellipse': {
        range =  {
          xRange: [shape.cx - shape.rx, shape.cx + shape.rx],
          yRange: [shape.cy - shape.ry, shape.cy + shape.ry]
        };
        break;
      }
      case 'image': {
        const style = geo.style;
        range = {
          xRange: [style.x, style.x + style.width],
          yRange: [style.y, style.y + style.height]
        };
        break;
      }
      case 'polyline': {
        const points: Array<[number, number]> = geo.shape.points;
        if (points.length > 0) {
          points.forEach(([x, y], index) => {
            if (index === 0) {
              range = {
                xRange: [x, x],
                yRange: [y, y]
              }
            } else {
              range = {
                xRange: [Math.min(range.xRange[0], x), Math.max(range.xRange[1], x)],
                yRange: [Math.min(range.yRange[0], y), Math.max(range.yRange[1], y)]
              }
            }
          })
        }
        break;
      }
    }
    return {
      xRange: range.xRange.sort((a, b) => a - b),
      yRange: range.yRange.sort((a, b) => a - b)
    } as {
      xRange: [number, number], yRange: [number, number]
    }
  }

  private computedNumberInRange(number: number, range: [number, number]) {
    if (number > range[1]) {
      return range[1];
    }
    if (number < range[0]) {
      return range[0];
    }
    return number;
  }

  private switchModeHooks: Array<() => void> = [];

  public setMode(mode: AnnotationEditorMode | undefined | AnnotationEditorMode[]) {
    this.workspace.attr({
      draggable: false
    });
    this.switchModeHooks.forEach(handler => {
      handler();
    });
    this.switchModeHooks = [];

    if (Array.isArray(mode)) {
      mode.forEach(item => {
        this.switchMode(item);
      })
    } else {
      this.switchMode(mode);
    }
  }

  public switchMode(mode: AnnotationEditorMode | undefined) {
    const on = (name: string, handler: Function) => {
      this.instance.on(name, handler);
      this.switchModeHooks.push(() => {
        this.instance.off(name, handler);
      });
    };

    switch(mode) {
      case AnnotationEditorMode.DragWorkspace: {
        const mousedown = (e: any) => {
          if (e.target && e.target.category === 'backgroundImage') {
            e.cancelBubble = true;
            const mousedownPosition = {
              x: e.offsetX,
              y: e.offsetY
            };

            const [positionX, positionY] = this.workspace.position;
            const mousemove = (e: any) => {
              e.cancelBubble = true;

              this.workspace.attr({
                position: [
                  positionX + e.offsetX - mousedownPosition.x ,
                  positionY + e.offsetY - mousedownPosition.y
                ]
              })
            };
            this.instance.on('mousemove', mousemove);
            const mouseup = (e: any) => {
              e.cancelBubble = true;
              this.instance.off('mousemove', mousemove);
              this.instance.off('mouseup', mouseup);
            };
            this.instance.on('mouseup', mouseup);
          };
          
        };
        on('mousedown', mousedown);
        break;
      }
      case AnnotationEditorMode.ScaleWorkspace: {
        const mousewheel = (e: any) => {
          if (e.event.altKey) {
            const [scaleX, scaleY] = this.workspace.scale;
            const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
            this.workspace.attr({
              origin: [offsetX, offsetY],
              scale: [scaleX + 0.1 * e.wheelDelta, scaleY + 0.1 * e.wheelDelta]
            });
          }
        };
        on('mousewheel', mousewheel);
        break;
      }
      case AnnotationEditorMode.DrawRect: {
        const mousedown = (e: any) => {
          e.cancelBubble = true;
          const { xRange, yRange } = this.computedShapeXyRange(this.image);
          const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);

          if (offsetX < xRange[0] || offsetX > xRange[1] || offsetY < yRange[0] || offsetY > yRange[1]) {
            return;
          }

          const mousedownPosition = {
            x: offsetX,
            y: offsetY
          };
          const grp = new zrender.Group({
            draggable: false,
            position: [0, 0]
          });
          grp.category = 'annotation';
          const rect = new zrender.Rect({
            style: this.globalStyle,
            shape: {
              x: offsetX,
              y: offsetY
            }
          });
          grp.add(rect);
          this.workspace.add(grp);

          const mousemove = (e: any) => {
            e.cancelBubble = true;
            const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
            const diffX = offsetX - mousedownPosition.x;
            const diffY = offsetY - mousedownPosition.y;
            rect.attr({
              shape: {
                width: offsetX > 0 ? Math.min(diffX, xRange[1] - rect.shape.x) : Math.max(diffX, xRange[0] - rect.shape.x),
                height: offsetY > 0 ? Math.min(diffY, yRange[1] - rect.shape.y) : Math.max(diffY, yRange[0] - rect.shape.y)
              }
            });
          };

          on('mousemove', mousemove);

          const mouseup = (e: any) => {
            e.cancelBubble = true;
            const { xRange, yRange } = this.computedShapeXyRange(rect);
            rect.attr({
              shape: {
                x: xRange[0],
                y: yRange[0],
                width: xRange[1] - xRange[0],
                height: yRange[1] - yRange[0]
              }
            })
            this.objects.push(grp);

            this.instance.off('mousemove', mousemove);
            this.instance.off('mouseup', mouseup);
          };

          on('mouseup', mouseup);
        };

        on('mousedown', mousedown);
        break;
      }
      case AnnotationEditorMode.DrawPolyline: {
        let points: Array<[number, number]> = [];
        let polyline: any;
        let range = { xRange: [0, 0], yRange: [0, 0] };
        const click = (e: any) => {
          e.cancelBubble = true;
          if (!polyline) {
            range = this.computedShapeXyRange(this.image);
          }
          const { xRange, yRange } = range; 
          const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
          if (offsetX < xRange[0] || offsetX > xRange[1] || offsetY < yRange[0] || offsetY > yRange[1]) {
            return;
          }
          points.push([offsetX, offsetY]);

          if (!polyline) {
            const grp = new zrender.Group({
              draggable: false,
              position: [0, 0]
            });
            grp.category = 'annotation';

            polyline = new zrender.Polyline({
              style: this.globalStyle,
              shape: {
                points: []
              }
            });
            grp.add(polyline);

            const mousemove = (e: any) => {
              e.cancelBubble = true;
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
              polyline.attr({
                shape: {
                  points: [...points, [offsetX, offsetY]]
                }
              });
            };
            on('mousemove', mousemove);

            const dblclick = (e: any) => {
              e.cancelBubble = true;
              this.instance.off('mousemove', mousemove);
              this.instance.off('dblclick', dblclick);
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);

              if (offsetX < xRange[0] || offsetX > xRange[1] || offsetY < yRange[0] || offsetY > yRange[1]) {
                this.workspace.remove(grp);
                points = [];
                polyline = null;
                return;
              }

              points.splice(-1, 1, points[0]);
              polyline.attr({
                shape: {
                  points: [...points]
                }
              });
              this.objects.push(grp);

              points = [];
              polyline = null;
            };
            on('dblclick', dblclick);

            this.workspace.add(grp);
          }

          polyline.attr({
            shape: {
              points: [...points]
            }
          });
        };
        on('click', click);
        break;
      }
      case AnnotationEditorMode.EditObject: {
        let prevGroup: any;
        const mousedown = (e: any) => {
          const grp = e.target && this.getObjectGroup(e.target, 2);
          if (grp) {
            e.cancelBubble = true;
            if (prevGroup && grp !== prevGroup) {
              const controller = prevGroup.children().find((item: any) => item.category === 'controller');
              controller && prevGroup.remove(controller);
            }
            prevGroup = grp;
            this.drawObjectController(grp);

            const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
            const mousedownPosition = {
              x: offsetX,
              y: offsetY
            };
  
            const geoRange = this.computedShapeXyRange(grp.childAt(0));
  
            const range = {
              rangeX: [geoRange.xRange[0] + grp.position[0], geoRange.xRange[1] + grp.position[0]],
              rangeY: [geoRange.yRange[0] + grp.position[1], geoRange.yRange[1] + grp.position[1]]
            };
            const [positionX, positionY] = grp.position;
  
            const xRange: [number, number] = [-range.rangeX[0], this.image.style.width - range.rangeX[1]];
            const yRange: [number, number] = [-range.rangeY[0], this.image.style.height - range.rangeY[1]];
    
            const mousemove = (e: any) => {
              e.cancelBubble = true;
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
  
              grp.attr({
                position: [
                  positionX + this.computedNumberInRange(offsetX - mousedownPosition.x, xRange),
                  positionY + this.computedNumberInRange(offsetY - mousedownPosition.y, yRange)
                ]
              })
            };
            this.instance.on('mousemove', mousemove);
            const mouseup = (e: any) => {
              e.cancelBubble = true;
              this.instance.off('mousemove', mousemove);
              this.instance.off('mouseup', mouseup);
            };
            this.instance.on('mouseup', mouseup);
          }
        };
        this.switchModeHooks.push(() => {
          if (prevGroup) {
            const controller = prevGroup.children().find((item: any) => item.category === 'controller');
            controller && prevGroup.remove(controller);
          }
        });
        on('mousedown', mousedown);
        break;
      }
      case AnnotationEditorMode.SelectObject: {
        const click = (e: any) => {
          e.cancelBubble = true;
          const grp = this.getObjectGroup(e.target);
          if (grp && this.options.select) {
            this.options.select(grp, this.toObjectData(grp));
          } 
        };

        on('click', click);
        break;
      }
    }
  }

  private drawObjectController(grp: any) {
    if (grp.children().find((item: any) => item.category === 'controller')) {
      return;
    }
    const object = grp.childAt(0);
    switch (object.type) {
      case 'polyline': {
        const controller = new zrender.Group();
        controller.category = 'controller';

        object.shape.points.forEach((point: [number, number], index: number) => {
          const circle = new zrender.Circle({
            style: {
              fill: 'red'
            },
            shape: {
              cx: point[0],
              cy: point[1],
              r: 4
            }
          });
          const mousedown = (e: any) => {
            e.cancelBubble = true;
            const grp = circle.parent.parent;
            const { cx, cy } = circle.shape;
            const xRange: [number, number] = [-grp.position[0], this.image.style.width - grp.position[0]];
            const yRange: [number, number] = [-grp.position[1], this.image.style.height - grp.position[1]];
      
            const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
      
            const mousedownPosition = {
              x: offsetX,
              y: offsetY
            };
      
            const mousemove = (e: any) => {
              e.cancelBubble = true;
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
      
              const diffX = this.computedNumberInRange(cx + offsetX - mousedownPosition.x, xRange);
              const diffY = this.computedNumberInRange(cy + offsetY - mousedownPosition.y, yRange);
      
              circle.attr({
                shape: {
                  cx: diffX,
                  cy: diffY
                }
              });
              object.shape.points[index] = [diffX, diffY];
              if (index === 0) {
                object.shape.points[object.shape.points.length - 1] = [diffX, diffY];
              }
              object.attr({
                shape: {
                  points: object.shape.points
                }
              });
            };
            this.instance.on('mousemove', mousemove);
            const mouseup = (e: any) => {
              e.cancelBubble = true;
              this.instance.off('mousemove', mousemove);
              this.instance.off('mouseup', mouseup);
            };
            this.instance.on('mouseup', mouseup);
          }
          circle.on('mousedown', mousedown);
          if (index === object.shape.points.length - 1) {
            return;
          }
          controller.add(circle);
        });
        grp.add(controller);
        return controller;
      }
      case 'rect': {
        const controller = new zrender.Group();
        controller.category = 'controller';

        const getPoints = () => {
          const { xRange, yRange } = this.computedShapeXyRange(object);
          return [
            [xRange[0], yRange[0]],
            [xRange[1], yRange[0]],
            [xRange[1], yRange[1]],
            [xRange[0], yRange[1]]
          ];
        };

        const circles: any[] = [];

        getPoints().forEach((point, index: number) => {
          const circle = new zrender.Circle({
            style: {
              fill: 'red'
            },
            shape: {
              cx: point[0],
              cy: point[1],
              r: 4
            }
          });
          circles.push(circle);

          const mousedown = (e: any) => {
            e.cancelBubble = true;
            const grp = circle.parent.parent;
            const { cx, cy } = circle.shape;
            const objectShape = { ...object.shape };
            const pointRange = {
              xRange: [-grp.position[0], this.image.style.width - grp.position[0]],
              yRange: [-grp.position[1], this.image.style.height - grp.position[1]]
            };

            const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
      
            const mousedownPosition = {
              x: offsetX,
              y: offsetY
            };
      
            const mousemove = (e: any) => {
              e.cancelBubble = true;
              const [offsetX, offsetY] = this.workspace.transformCoordToLocal(e.offsetX, e.offsetY);
      
              const diffX = this.computedNumberInRange(cx + offsetX - mousedownPosition.x, pointRange.xRange as [number, number]);
              const diffY = this.computedNumberInRange(cy + offsetY - mousedownPosition.y, pointRange.yRange as [number, number]);

              switch (index) {
                case 0: {
                  object.attr({
                    shape: {
                      x: objectShape.x + (diffX - cx),
                      y: objectShape.y + (diffY - cy),
                      width: objectShape.width - (diffX - cx),
                      height: objectShape.height - (diffY - cy)
                    }
                  })
                  break;
                }
                case 1: {
                  object.attr({
                    shape: {
                      y: objectShape.y + (diffY - cy),
                      width: objectShape.width + (diffX - cx),
                      height: objectShape.height - (diffY - cy)
                    }
                  })
                  break;
                }
                case 2: {
                  object.attr({
                    shape: {
                      width: objectShape.width + (diffX - cx),
                      height: objectShape.height + (diffY - cy)
                    }
                  })
                  break;
                }
                case 3: {
                  object.attr({
                    shape: {
                      x: objectShape.x + (diffX - cx),
                      width: objectShape.width - (diffX - cx),
                      height: objectShape.height + (diffY - cy)
                    }
                  })
                  break;
                }
              }
              getPoints().forEach((point, index) => {
                circles[index].attr({
                  shape: {
                    cx: point[0],
                    cy: point[1]
                  }
                })
              })
            };
            this.instance.on('mousemove', mousemove);
            const mouseup = (e: any) => {
              e.cancelBubble = true;
              const { xRange, yRange } = this.computedShapeXyRange(object);
              object.attr({
                shape: {
                  x: xRange[0],
                  y: yRange[0],
                  width: xRange[1] - xRange[0],
                  height: yRange[1] - yRange[0]
                }
              });
              this.objects.push(grp);
              this.instance.off('mousemove', mousemove);
              this.instance.off('mouseup', mouseup);
            };
            this.instance.on('mouseup', mouseup);
          }
          circle.on('mousedown', mousedown);
          controller.add(circle);
        });
        grp.add(controller);
        return controller;
      }
    }
  }

  private getObjectGroup(target: any, max = 5): undefined | any {
    if (!target) {
      return;
    }
    let depth = 0;

    const deep = (node: any): undefined | any => {
      if (depth > max) {
        return;
      }
      if (node instanceof zrender.Group) {
        return node.category === 'annotation' && node;
      }
      if (!node.parent) {
        return;
      }
      depth++;
      return deep(node.parent);
    }

    return deep(target);
  }

  private toObjectModel(obj: ObjectData, isGroup = true) {
    const { type, position = [0, 0], scale = [1, 1], rotation = 0, style = {}, shape = {} } = obj;

    const GeoMap = {
      image: zrender.Image,
      rect: zrender.Rect,
      polyline: zrender.Polyline
    };

    if (isGroup) {
      const grp = new zrender.Group({
        position,
        scale,
        rotation
      });
      grp.category = 'annotation';

      const geo = new GeoMap[type]({
        style,
        shape
      });
  
      grp.add(geo);
      return grp;
    } else {
      return new GeoMap[type]({
        position,
        scale,
        rotation,
        style,
        shape
      })
    }
  }

  private toObjectData(grp: any): ObjectData {
    const geo = grp.childAt(0);

    return {
      type: geo.type,
      style: { ...(geo.style || {}) },
      shape: { ...(geo.shape || {}) },
      position: grp.position || [0, 0],
      scale: grp.scale || [1, 1],
      rotation: grp.rotation || 0,
    }
  }

  public clipImage() {
    const origin = document.createElement('canvas');
    origin.width = this.instance.getWidth();
    origin.height = this.instance.getHeight();

    const instance = zrender.init(origin);

    const workspace = this.toObjectModel(this.toObjectData(this.workspace));
    workspace.attr({
      scale: [1, 1],
      position: [0, 0],
      rotation: 0
    })

    instance.add(workspace);

    let prevGeo: any = null;
    this.objects.forEach(object => {
      if (prevGeo) {
        workspace.removeClipPath();
        workspace.remove(prevGeo);
      }

      const objectData = this.toObjectData(object);
      const geo = this.toObjectModel({
        ...objectData,
        style: {
          ...objectData.style,
          stroke: 'transparent'
        },
      }, false);

      prevGeo = geo;
      workspace.add(geo);
      workspace.setClipPath(geo);

      instance.flush();

      const {xRange, yRange} = this.computedShapeXyRange(geo);

      const imageData = origin.getContext('2d')?.getImageData(
        xRange[0] + objectData.position[0],
        yRange[0] + objectData.position[1],
        xRange[1] - xRange[0],
        yRange[1] - yRange[0]
      );

      const canvas = document.createElement('canvas');
      canvas.width = xRange[1] - xRange[0];
      canvas.height = yRange[1] - yRange[0];

      const target = zrender.init(canvas);
      canvas.getContext('2d')?.putImageData(imageData as ImageData, 0, 0);

      const link = document.createElement('a');
      link.href = canvas.toDataURL();
      link.download = `./${+new Date()}.png`;
      link.click();

      target.dispose();
    });

    instance.dispose();
  }

  public destroy() {
    if (this.instance) {;
      this.switchModeHooks.forEach(handler => {
        handler();
      });
      this.switchModeHooks = [];
      this.instance.dispose();
    }
  }
  
  public removeObjects() {
    if (this.workspace) {
      this.objects.forEach(shape => {
        this.workspace.remove(shape);
      });
      this.objects = [];
    }
  }
}