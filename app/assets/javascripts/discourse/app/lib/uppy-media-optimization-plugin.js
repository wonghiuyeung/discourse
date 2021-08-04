import { Plugin } from "@uppy/core";
import { warn } from "@ember/debug";
import { Promise } from "rsvp";

export default class UppyMediaOptimization extends Plugin {
  constructor(uppy, opts) {
    super(uppy, opts);
    this.id = opts.id || "uppy-media-optimization";

    this.type = "preprocessor";
    this.optimizeFn = opts.optimizeFn;
    this.runParallel = opts.runParallel || false;
  }

  _optimizeFile(fileId) {
    let file = this.uppy.getFile(fileId);

    this.uppy.emit("preprocess-progress", file, {
      mode: "indeterminate",
      message: "optimizing images",
    });

    return this.optimizeFn(file)
      .then((optimizedFile) => {
        if (!optimizedFile) {
          warn("Nothing happened, possible error or other restriction.", {
            id: "discourse.uppy-media-optimization",
          });
        } else {
          this.uppy.setFileState(fileId, { data: optimizedFile });
        }
        this.uppy.emit("preprocess-complete", file);
      })
      .catch((err) => warn(err, { id: "discourse.uppy-media-optimization" }));
  }

  _optimizeParallel(fileIds) {
    return Promise.all(fileIds.map(this._optimizeFile.bind(this)));
  }

  async _optimizeSerial(fileIds) {
    let optimizeTasks = fileIds.map((fileId) => () =>
      this._optimizeFile.call(this, fileId)
    );

    for (const task of optimizeTasks) {
      await task();
    }
  }

  install() {
    if (this.runParallel) {
      this.uppy.addPreProcessor(this._optimizeParallel.bind(this));
    } else {
      this.uppy.addPreProcessor(this._optimizeSerial.bind(this));
    }
  }

  uninstall() {
    if (this.runParallel) {
      this.uppy.removePreProcessor(this._optimizeParallel.bind(this));
    } else {
      this.uppy.removePreProcessor(this._optimizeSerial.bind(this));
    }
  }
}
