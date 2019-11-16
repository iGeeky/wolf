<template>
  <div id="rbacDiagram" class="diagram" />
</template>
<script>
import go from 'gojs'
const $ = go.GraphObject.make
export default {
  name: 'RbacDiagram',
  props: {
    modelData: {
      type: Object,
      required: true,
    },
  },
  watch: {
    modelData: function(val) { this.updateModel(val) },
  },

  mounted: function() {
    var greengrad = $(go.Brush, 'Linear', { 0: '#98FB98', 1: '#9ACD32' })
    var bluegrad = $(go.Brush, 'Linear', { 0: '#B0E0E6', 1: '#87CEEB' })
    var redgrad = $(go.Brush, 'Linear', { 0: '#C45245', 1: '#871E1B' })
    var whitegrad = $(go.Brush, 'Linear', { 0: '#1890ff', 1: '#1890ff' })

    var bigfont = 'bold 13pt Helvetica, Arial, sans-serif'
    var smallfont = 'bold 11pt Helvetica, Arial, sans-serif'

    // Common text styling
    function textStyle() {
      return {
        margin: 6,
        wrap: go.TextBlock.WrapFit,
        textAlign: 'center',
        editable: false,
        font: smallfont,
      }
    }

    var myDiagram = $(go.Diagram, 'rbacDiagram',
      {
        // have mouse wheel events zoom in and out instead of scroll up and down
        'toolManager.mouseWheelBehavior': go.ToolManager.WheelZoom,
        initialAutoScale: go.Diagram.Uniform,
        'linkingTool.direction': go.LinkingTool.ForwardsOnly,
        layout: $(go.LayeredDigraphLayout, { isInitial: false, isOngoing: false, layerSpacing: 150 }),
        'undoManager.isEnabled': true,
      })
    const fromEndSegmentLength = 80
    const toEndSegmentLength = 80
    myDiagram.nodeTemplate =
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        // define the node's outer shape, which will surround the TextBlock
        $(go.Shape, 'Rectangle',
          {
            fill: redgrad, stroke: 'black',
            portId: '', fromLinkable: true, toLinkable: true, cursor: 'pointer',
            toEndSegmentLength, fromEndSegmentLength,
          }),
        $(go.TextBlock, 'Default',
          {
            margin: 6,
            font: bigfont,
            editable: false,
          },
          new go.Binding('text', 'text').makeTwoWay()))

    myDiagram.nodeTemplateMap.add('user',
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'RoundedRectangle',
          {
            fill: bluegrad,
            portId: '', fromLinkable: true, cursor: 'pointer',
            toEndSegmentLength, fromEndSegmentLength,
          }),
        $(go.Panel, 'Horizontal',
          $(go.TextBlock, 'user:', textStyle()),
          $(go.TextBlock, 'Source', textStyle(), new go.Binding('text', 'text').makeTwoWay())),
      ))
    myDiagram.nodeTemplateMap.add('role',
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'RoundedRectangle',
          { fill: greengrad, portId: '', toLinkable: true,
            toEndSegmentLength, fromEndSegmentLength }),
        $(go.Panel, 'Horizontal',
          $(go.TextBlock, 'role:', textStyle()),
          $(go.TextBlock, 'Role', textStyle(), new go.Binding('text', 'text').makeTwoWay())),
      ))
    myDiagram.nodeTemplateMap.add('permission',
      $(go.Node, 'Auto',
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'Rectangle',
          { fill: whitegrad, portId: '', toLinkable: true,
            toEndSegmentLength, fromEndSegmentLength }),
        $(go.Panel, 'Horizontal',
          $(go.TextBlock, 'perm:', textStyle()),
          $(go.TextBlock, 'permission', textStyle(), new go.Binding('text', 'text').makeTwoWay())),

      ))

    // go.Link.Bezier
    myDiagram.linkTemplate = $(go.Link, // the whole link panel
      new go.Binding('points').makeTwoWay(),
      { curve: go.Link.Bezier, toShortLength: 15 },
      new go.Binding('curviness', 'curviness'),
      $(go.Shape, // the link shape
        { stroke: '#2F4F4F', strokeWidth: 1.5 }),
      $(go.Shape, // the arrowhead
        { toArrow: 'Standard', fill: '#2F4F4F', stroke: null, scale: 2 }),
    )

    this.diagram = myDiagram

    this.updateModel(this.modelData)
    myDiagram.layoutDiagram(true)
  },
  methods: {
    model: function() {
      return this.diagram.model
    },
    updateModel: function(val) {
      // No GoJS transaction permitted when replacing Diagram.model.
      if (val instanceof go.Model) {
        this.diagram.model = val
      } else {
        var m = new go.GraphLinksModel()
        if (val) {
          for (var p in val) {
            m[p] = val[p]
          }
        }
        this.diagram.model = m
      }
    },
    updateDiagramFromData: function() {
      this.diagram.startTransaction()
      // This is very general but very inefficient.
      // It would be better to modify the diagramData data by calling
      // Model.setDataProperty or Model.addNodeData, et al.
      this.diagram.updateAllRelationshipsFromData()
      this.diagram.updateAllTargetBindings()
      this.diagram.commitTransaction('updated')
    },
    refreshDiagram: function() {
      this.updateModel(this.modelData)
      this.diagram.layoutDiagram(true)
    },
  },
}
</script>

<style lang="scss" scoped>
 .diagram {
  width: 100%;
  height: 100%;
  min-height: 600px;
  background: #F5F5F5;
  border-radius: 10px;
  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.37);
}
</style>

