export function htmlScript(script?: null | string): string {
  return `
<script>
window.onload = () => {
  const onCallback = (event, data) => {
    if (window.ReactNativeWebView) {
      const dataString = JSON.stringify({event, data});
      window.ReactNativeWebView.postMessage(dataString);
    }
  };

  const importFromXml = (xml, workspace) => {
    try {
      if (workspace.getAllBlocks(false).length > 0) return;
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
      return true;
    } catch (err) {
      onCallback('onError', err?.toString());
      return false;
    }
  };

  const importFromJson = (json, workspace) => {
    try {
      Blockly.serialization.workspaces.load(json, workspace);
      return true;
    } catch (err) {
      onCallback('onError', err?.toString());
      return false;
    }
  };

  function nullToUndefined(data) {
    if (data === null) {
      return;
    } else if (Array.isArray(data)) {
      return data.map(nullToUndefined);
    } else if (typeof data === 'object') {
      const tempObj = {};
      Object.keys(data).forEach(key => {
        tempObj[key] = nullToUndefined(data[key]);
      });
      return tempObj;
    } else {
      return data;
    }
  }

  const BlocklyEditor = () => {
    let _workspace = null;
    let _toolboxConfig = null;
    let _state = BlocklyState();
    let _readOnly = false;

    function init(params) {
      const element = document.querySelector('#blocklyEditor');
      if (!Blockly || !element || _toolboxConfig) {
        return;
      }

      const workspace = Blockly.inject(element, params?.workspaceConfiguration);

      if (workspace) {
        _workspace = workspace;
        _toolboxConfig = params?.workspaceConfiguration?.toolbox || {contents: []};
        _readOnly = !!params?.workspaceConfiguration?.readOnly;
        onCallback('toolboxConfig', _toolboxConfig);
        onCallback('onInject', _state);
        _setState(params?.initial);
        _workspace.addChangeListener(listener);
      }
    }

    function dispose() {
      if (_workspace) {
        _workspace.removeChangeListener(listener);
        _workspace.dispose();
        let _workspace = null;
        let _toolboxConfig = null;
        let _state = BlocklyState();
        let _readOnly = false;
      }
    }

    function listener(event) {
      if (!event.isUiEvent && _workspace) {
        _saveData();
      }
    }

    function updateToolboxConfig(configuration) {
      try {
        if (
          configuration &&
          _workspace &&
          !_readOnly
        ) {
          _toolboxConfig = configuration;
          _workspace.updateToolbox(configuration);
          onCallback('toolboxConfig', _toolboxConfig);
        }
      } catch (err) {
        onCallback('onError', err?.toString());
      }
    }

    function updateState(newState) {
      try {
        if (newState) {
          _setState(newState);
        }
      } catch(err) {
        onCallback('onError', err?.toString());
      }
    }

    function state() {
      return _state;
    }

    function BlocklyState({xml, json} = {}) {
      return {
        xml: xml || '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
        json: json || {},
      };
    }

    function _setState(newState) {
      if (_workspace) {
        if (typeof newState === 'string') {
          importFromXml(newState, _workspace);
        } else if (newState && typeof newState === 'object') {
          importFromJson(newState, _workspace);
        }
        _saveData();
      }
    }

    function _saveData() {
      try {
        if (_workspace) {
          const newXml = Blockly.Xml.domToText(
            Blockly.Xml.workspaceToDom(_workspace),
          );
          if (newXml !== _state.xml) {
            _state = BlocklyState({
              xml: newXml,
              json: Blockly.serialization.workspaces.save(_workspace),
            });
            onCallback('onChange', _state);
            return true;
          }
        }
        return false;
      } catch (err) {
        onCallback('onError', err?.toString());
        return false;
      }
    }

    return {
      workspace: _workspace,
      init,
      dispose,
      state,
      updateToolboxConfig,
      updateState,
    };
  };

  const editor = BlocklyEditor();

  function handleEvent(message) {
    try {
      const { event, data } = JSON.parse(message.data);
      if (editor[event]) {
        editor[event](nullToUndefined(data));
      }
    } catch (err) {
      onCallback('onError', err?.toString());
    }
  }

  document.addEventListener("message", handleEvent);

  ${script ?? ''}
}
</script>
`;
}
