// Lean compiler output
// Module: Algal.Core.Graph
// Imports: public import Init public meta import Init public import Algal.Core.Ports
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(lean_object*, lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Ports_compatible(lean_object*, lean_object*);
uint8_t lp_algalVerification_Algal_Core_Ports_instDecidableEqKind_decEq(lean_object*, lean_object*);
uint8_t lp_algalVerification_List_elem___at___00Algal_Core_Ports_labelsCompatible_spec__0(lean_object*, lean_object*);
lean_object* l_instDecidableEqString___boxed(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Ports_instDecidableEqPort___boxed(lean_object*, lean_object*);
uint8_t l_instDecidableEqProd___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
uint8_t l_Option_instDecidableEq___redArg(lean_object*, lean_object*, lean_object*);
uint8_t l_List_nodupDecidable___redArg(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___lam__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___lam__0___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqCell(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqCell___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_none_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_none_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_expression_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_expression_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_field_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_field_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_label_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_label_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___lam__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___lam__0___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___lam__0___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___lam__0___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownInput(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownInput___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownOutput(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownOutput___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_interfaceInput(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_interfaceInput___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_guardValid(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_guardValid___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_edgeValid(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_edgeValid___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_rank(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_rank___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_rankValid(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_rankValid___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Core_Graph_inbound_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Core_Graph_inbound_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_inbound(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_inbound___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_cardinalityValid_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_cardinalityValid_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_cardinalityValid(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_cardinalityValid___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_Graph_uniqueNames_spec__0___redArg(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_uniqueNames(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_uniqueNames___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_Graph_uniqueNames_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__1(lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__1___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__0(lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_interfaceValid(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_interfaceValid___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__3(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__3___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__2___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__1___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_checkCertificate(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_checkCertificate___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_edgeValid_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_edgeValid_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_cardinalityValid_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_cardinalityValid_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedInput(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedInput___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedOutput(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedOutput___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__3(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__3___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__2(lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__2___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__1(lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__1___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_unliftedChildCorresponds(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_unliftedChildCorresponds___boxed(lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_textPort___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 8, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_textPort___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_textPort___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Graph_textPort = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_textPort___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "input"};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 4, .m_capacity = 4, .m_length = 3, .m_data = "out"};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__1_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_textPort___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__2_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 8, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__3_value),LEAN_SCALAR_PTR_LITERAL(1, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "echo"};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__6_value;
static const lean_string_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "in"};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__7_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__7_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_textPort___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__8_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__9_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 8, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__9_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__3_value),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__6_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__11_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__11_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleCells___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__5_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__12_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__13_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Graph_exampleCells = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__13_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__6_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__7_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 8, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__1_value),((lean_object*)(((size_t)(0) << 1) | 1)),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__2_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Graph_exampleEdge = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__2_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 6, .m_capacity = 6, .m_length = 5, .m_data = "value"};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__1_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleEdge___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__2_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__3_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__6_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__1_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__5_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__3_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__7_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 0, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__13_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__7_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__8_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Graph_exampleGraph = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleGraph___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__0_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleCells___closed__6_value),((lean_object*)(((size_t)(1) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__1_value),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__3_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_Graph_exampleRanks = (const lean_object*)&lp_algalVerification_Algal_Core_Graph_exampleRanks___closed__3_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq(lean_object* v_x_1_, lean_object* v_x_2_){
_start:
{
lean_object* v_cell_3_; lean_object* v_port_4_; lean_object* v_cell_5_; lean_object* v_port_6_; uint8_t v___x_7_; 
v_cell_3_ = lean_ctor_get(v_x_1_, 0);
v_port_4_ = lean_ctor_get(v_x_1_, 1);
v_cell_5_ = lean_ctor_get(v_x_2_, 0);
v_port_6_ = lean_ctor_get(v_x_2_, 1);
v___x_7_ = lean_string_dec_eq(v_cell_3_, v_cell_5_);
if (v___x_7_ == 0)
{
return v___x_7_;
}
else
{
uint8_t v___x_8_; 
v___x_8_ = lean_string_dec_eq(v_port_4_, v_port_6_);
return v___x_8_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq___boxed(lean_object* v_x_9_, lean_object* v_x_10_){
_start:
{
uint8_t v_res_11_; lean_object* v_r_12_; 
v_res_11_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq(v_x_9_, v_x_10_);
lean_dec_ref(v_x_10_);
lean_dec_ref(v_x_9_);
v_r_12_ = lean_box(v_res_11_);
return v_r_12_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint(lean_object* v_x_13_, lean_object* v_x_14_){
_start:
{
uint8_t v___x_15_; 
v___x_15_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq(v_x_13_, v_x_14_);
return v___x_15_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint___boxed(lean_object* v_x_16_, lean_object* v_x_17_){
_start:
{
uint8_t v_res_18_; lean_object* v_r_19_; 
v_res_18_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint(v_x_16_, v_x_17_);
lean_dec_ref(v_x_17_);
lean_dec_ref(v_x_16_);
v_r_19_ = lean_box(v_res_18_);
return v_r_19_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___lam__0(lean_object* v_a_20_, lean_object* v_b_21_){
_start:
{
lean_object* v___x_22_; lean_object* v___x_23_; uint8_t v___x_24_; 
v___x_22_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_23_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Ports_instDecidableEqPort___boxed), 2, 0);
v___x_24_ = l_instDecidableEqProd___redArg(v___x_22_, v___x_23_, v_a_20_, v_b_21_);
return v___x_24_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___lam__0___boxed(lean_object* v_a_25_, lean_object* v_b_26_){
_start:
{
uint8_t v_res_27_; lean_object* v_r_28_; 
v_res_27_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___lam__0(v_a_25_, v_b_26_);
v_r_28_ = lean_box(v_res_27_);
return v_r_28_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq(lean_object* v_x_30_, lean_object* v_x_31_){
_start:
{
uint8_t v_inputCell_32_; lean_object* v_inputs_33_; lean_object* v_outputs_34_; uint8_t v_inputCell_35_; lean_object* v_inputs_36_; lean_object* v_outputs_37_; lean_object* v___f_38_; 
v_inputCell_32_ = lean_ctor_get_uint8(v_x_30_, sizeof(void*)*2);
v_inputs_33_ = lean_ctor_get(v_x_30_, 0);
lean_inc(v_inputs_33_);
v_outputs_34_ = lean_ctor_get(v_x_30_, 1);
lean_inc(v_outputs_34_);
lean_dec_ref(v_x_30_);
v_inputCell_35_ = lean_ctor_get_uint8(v_x_31_, sizeof(void*)*2);
v_inputs_36_ = lean_ctor_get(v_x_31_, 0);
lean_inc(v_inputs_36_);
v_outputs_37_ = lean_ctor_get(v_x_31_, 1);
lean_inc(v_outputs_37_);
lean_dec_ref(v_x_31_);
v___f_38_ = ((lean_object*)(lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___closed__0));
if (v_inputCell_32_ == 0)
{
if (v_inputCell_35_ == 0)
{
goto v___jp_39_;
}
else
{
lean_dec(v_outputs_37_);
lean_dec(v_inputs_36_);
lean_dec(v_outputs_34_);
lean_dec(v_inputs_33_);
return v_inputCell_32_;
}
}
else
{
if (v_inputCell_35_ == 0)
{
lean_dec(v_outputs_37_);
lean_dec(v_inputs_36_);
lean_dec(v_outputs_34_);
lean_dec(v_inputs_33_);
return v_inputCell_35_;
}
else
{
goto v___jp_39_;
}
}
v___jp_39_:
{
uint8_t v___x_40_; 
v___x_40_ = l_instDecidableEqList___redArg(v___f_38_, v_inputs_33_, v_inputs_36_);
if (v___x_40_ == 0)
{
lean_dec(v_outputs_37_);
lean_dec(v_outputs_34_);
return v___x_40_;
}
else
{
uint8_t v___x_41_; 
v___x_41_ = l_instDecidableEqList___redArg(v___f_38_, v_outputs_34_, v_outputs_37_);
return v___x_41_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq___boxed(lean_object* v_x_42_, lean_object* v_x_43_){
_start:
{
uint8_t v_res_44_; lean_object* v_r_45_; 
v_res_44_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq(v_x_42_, v_x_43_);
v_r_45_ = lean_box(v_res_44_);
return v_r_45_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqCell(lean_object* v_x_46_, lean_object* v_x_47_){
_start:
{
uint8_t v___x_48_; 
v___x_48_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqCell_decEq(v_x_46_, v_x_47_);
return v___x_48_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqCell___boxed(lean_object* v_x_49_, lean_object* v_x_50_){
_start:
{
uint8_t v_res_51_; lean_object* v_r_52_; 
v_res_51_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqCell(v_x_49_, v_x_50_);
v_r_52_ = lean_box(v_res_51_);
return v_r_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorIdx(lean_object* v_x_53_){
_start:
{
switch(lean_obj_tag(v_x_53_))
{
case 0:
{
lean_object* v___x_54_; 
v___x_54_ = lean_unsigned_to_nat(0u);
return v___x_54_;
}
case 1:
{
lean_object* v___x_55_; 
v___x_55_ = lean_unsigned_to_nat(1u);
return v___x_55_;
}
case 2:
{
lean_object* v___x_56_; 
v___x_56_ = lean_unsigned_to_nat(2u);
return v___x_56_;
}
default: 
{
lean_object* v___x_57_; 
v___x_57_ = lean_unsigned_to_nat(3u);
return v___x_57_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorIdx___boxed(lean_object* v_x_58_){
_start:
{
lean_object* v_res_59_; 
v_res_59_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorIdx(v_x_58_);
lean_dec(v_x_58_);
return v_res_59_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(lean_object* v_t_60_, lean_object* v_k_61_){
_start:
{
if (lean_obj_tag(v_t_60_) == 3)
{
lean_object* v_value_62_; lean_object* v___x_63_; 
v_value_62_ = lean_ctor_get(v_t_60_, 0);
lean_inc_ref(v_value_62_);
lean_dec_ref_known(v_t_60_, 1);
v___x_63_ = lean_apply_1(v_k_61_, v_value_62_);
return v___x_63_;
}
else
{
lean_dec(v_t_60_);
return v_k_61_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorElim(lean_object* v_motive_64_, lean_object* v_ctorIdx_65_, lean_object* v_t_66_, lean_object* v_h_67_, lean_object* v_k_68_){
_start:
{
lean_object* v___x_69_; 
v___x_69_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_66_, v_k_68_);
return v___x_69_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___boxed(lean_object* v_motive_70_, lean_object* v_ctorIdx_71_, lean_object* v_t_72_, lean_object* v_h_73_, lean_object* v_k_74_){
_start:
{
lean_object* v_res_75_; 
v_res_75_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim(v_motive_70_, v_ctorIdx_71_, v_t_72_, v_h_73_, v_k_74_);
lean_dec(v_ctorIdx_71_);
return v_res_75_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_none_elim___redArg(lean_object* v_t_76_, lean_object* v_none_77_){
_start:
{
lean_object* v___x_78_; 
v___x_78_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_76_, v_none_77_);
return v___x_78_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_none_elim(lean_object* v_motive_79_, lean_object* v_t_80_, lean_object* v_h_81_, lean_object* v_none_82_){
_start:
{
lean_object* v___x_83_; 
v___x_83_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_80_, v_none_82_);
return v___x_83_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_expression_elim___redArg(lean_object* v_t_84_, lean_object* v_expression_85_){
_start:
{
lean_object* v___x_86_; 
v___x_86_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_84_, v_expression_85_);
return v___x_86_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_expression_elim(lean_object* v_motive_87_, lean_object* v_t_88_, lean_object* v_h_89_, lean_object* v_expression_90_){
_start:
{
lean_object* v___x_91_; 
v___x_91_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_88_, v_expression_90_);
return v___x_91_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_field_elim___redArg(lean_object* v_t_92_, lean_object* v_field_93_){
_start:
{
lean_object* v___x_94_; 
v___x_94_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_92_, v_field_93_);
return v___x_94_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_field_elim(lean_object* v_motive_95_, lean_object* v_t_96_, lean_object* v_h_97_, lean_object* v_field_98_){
_start:
{
lean_object* v___x_99_; 
v___x_99_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_96_, v_field_98_);
return v___x_99_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_label_elim___redArg(lean_object* v_t_100_, lean_object* v_label_101_){
_start:
{
lean_object* v___x_102_; 
v___x_102_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_100_, v_label_101_);
return v___x_102_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_Guard_label_elim(lean_object* v_motive_103_, lean_object* v_t_104_, lean_object* v_h_105_, lean_object* v_label_106_){
_start:
{
lean_object* v___x_107_; 
v___x_107_ = lp_algalVerification_Algal_Core_Graph_Guard_ctorElim___redArg(v_t_104_, v_label_106_);
return v___x_107_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq(lean_object* v_x_108_, lean_object* v_x_109_){
_start:
{
switch(lean_obj_tag(v_x_108_))
{
case 0:
{
switch(lean_obj_tag(v_x_109_))
{
case 0:
{
uint8_t v___x_110_; 
v___x_110_ = 1;
return v___x_110_;
}
case 3:
{
uint8_t v___x_111_; 
v___x_111_ = 0;
return v___x_111_;
}
default: 
{
uint8_t v___x_112_; 
v___x_112_ = 0;
return v___x_112_;
}
}
}
case 1:
{
switch(lean_obj_tag(v_x_109_))
{
case 1:
{
uint8_t v___x_113_; 
v___x_113_ = 1;
return v___x_113_;
}
case 3:
{
uint8_t v___x_114_; 
v___x_114_ = 0;
return v___x_114_;
}
default: 
{
uint8_t v___x_115_; 
v___x_115_ = 0;
return v___x_115_;
}
}
}
case 2:
{
switch(lean_obj_tag(v_x_109_))
{
case 2:
{
uint8_t v___x_116_; 
v___x_116_ = 1;
return v___x_116_;
}
case 3:
{
uint8_t v___x_117_; 
v___x_117_ = 0;
return v___x_117_;
}
default: 
{
uint8_t v___x_118_; 
v___x_118_ = 0;
return v___x_118_;
}
}
}
default: 
{
lean_object* v_value_119_; uint8_t v___x_120_; 
v_value_119_ = lean_ctor_get(v_x_108_, 0);
v___x_120_ = 0;
if (lean_obj_tag(v_x_109_) == 3)
{
lean_object* v_value_121_; uint8_t v___x_122_; 
v_value_121_ = lean_ctor_get(v_x_109_, 0);
v___x_122_ = lean_string_dec_eq(v_value_119_, v_value_121_);
if (v___x_122_ == 0)
{
return v___x_120_;
}
else
{
return v___x_122_;
}
}
else
{
return v___x_120_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq___boxed(lean_object* v_x_123_, lean_object* v_x_124_){
_start:
{
uint8_t v_res_125_; lean_object* v_r_126_; 
v_res_125_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq(v_x_123_, v_x_124_);
lean_dec(v_x_124_);
lean_dec(v_x_123_);
v_r_126_ = lean_box(v_res_125_);
return v_r_126_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard(lean_object* v_x_127_, lean_object* v_x_128_){
_start:
{
uint8_t v___x_129_; 
v___x_129_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq(v_x_127_, v_x_128_);
return v___x_129_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard___boxed(lean_object* v_x_130_, lean_object* v_x_131_){
_start:
{
uint8_t v_res_132_; lean_object* v_r_133_; 
v_res_132_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard(v_x_130_, v_x_131_);
lean_dec(v_x_131_);
lean_dec(v_x_130_);
v_r_133_ = lean_box(v_res_132_);
return v_r_133_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge_decEq(lean_object* v_x_134_, lean_object* v_x_135_){
_start:
{
lean_object* v_source_136_; lean_object* v_target_137_; uint8_t v_onFail_138_; lean_object* v_guard_139_; lean_object* v_source_140_; lean_object* v_target_141_; uint8_t v_onFail_142_; lean_object* v_guard_143_; uint8_t v___x_144_; 
v_source_136_ = lean_ctor_get(v_x_134_, 0);
v_target_137_ = lean_ctor_get(v_x_134_, 1);
v_onFail_138_ = lean_ctor_get_uint8(v_x_134_, sizeof(void*)*3);
v_guard_139_ = lean_ctor_get(v_x_134_, 2);
v_source_140_ = lean_ctor_get(v_x_135_, 0);
v_target_141_ = lean_ctor_get(v_x_135_, 1);
v_onFail_142_ = lean_ctor_get_uint8(v_x_135_, sizeof(void*)*3);
v_guard_143_ = lean_ctor_get(v_x_135_, 2);
v___x_144_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq(v_source_136_, v_source_140_);
if (v___x_144_ == 0)
{
return v___x_144_;
}
else
{
uint8_t v___x_145_; 
v___x_145_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq(v_target_137_, v_target_141_);
if (v___x_145_ == 0)
{
return v___x_145_;
}
else
{
if (v_onFail_138_ == 0)
{
if (v_onFail_142_ == 0)
{
uint8_t v___x_146_; 
v___x_146_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq(v_guard_139_, v_guard_143_);
return v___x_146_;
}
else
{
return v_onFail_138_;
}
}
else
{
if (v_onFail_142_ == 0)
{
return v_onFail_142_;
}
else
{
uint8_t v___x_147_; 
v___x_147_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq(v_guard_139_, v_guard_143_);
return v___x_147_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge_decEq___boxed(lean_object* v_x_148_, lean_object* v_x_149_){
_start:
{
uint8_t v_res_150_; lean_object* v_r_151_; 
v_res_150_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge_decEq(v_x_148_, v_x_149_);
lean_dec_ref(v_x_149_);
lean_dec_ref(v_x_148_);
v_r_151_ = lean_box(v_res_150_);
return v_r_151_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge(lean_object* v_x_152_, lean_object* v_x_153_){
_start:
{
uint8_t v___x_154_; 
v___x_154_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge_decEq(v_x_152_, v_x_153_);
return v___x_154_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge___boxed(lean_object* v_x_155_, lean_object* v_x_156_){
_start:
{
uint8_t v_res_157_; lean_object* v_r_158_; 
v_res_157_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge(v_x_155_, v_x_156_);
lean_dec_ref(v_x_156_);
lean_dec_ref(v_x_155_);
v_r_158_ = lean_box(v_res_157_);
return v_r_158_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___lam__0(lean_object* v_a_159_, lean_object* v_b_160_){
_start:
{
lean_object* v___x_161_; lean_object* v___x_162_; uint8_t v___x_163_; 
v___x_161_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_162_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint___boxed), 2, 0);
v___x_163_ = l_instDecidableEqProd___redArg(v___x_161_, v___x_162_, v_a_159_, v_b_160_);
return v___x_163_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___lam__0___boxed(lean_object* v_a_164_, lean_object* v_b_165_){
_start:
{
uint8_t v_res_166_; lean_object* v_r_167_; 
v_res_166_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___lam__0(v_a_164_, v_b_165_);
v_r_167_ = lean_box(v_res_166_);
return v_r_167_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq(lean_object* v_x_169_, lean_object* v_x_170_){
_start:
{
lean_object* v_inputs_171_; lean_object* v_outputs_172_; lean_object* v_inputs_173_; lean_object* v_outputs_174_; lean_object* v___f_175_; uint8_t v___x_176_; 
v_inputs_171_ = lean_ctor_get(v_x_169_, 0);
lean_inc(v_inputs_171_);
v_outputs_172_ = lean_ctor_get(v_x_169_, 1);
lean_inc(v_outputs_172_);
lean_dec_ref(v_x_169_);
v_inputs_173_ = lean_ctor_get(v_x_170_, 0);
lean_inc(v_inputs_173_);
v_outputs_174_ = lean_ctor_get(v_x_170_, 1);
lean_inc(v_outputs_174_);
lean_dec_ref(v_x_170_);
v___f_175_ = ((lean_object*)(lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___closed__0));
v___x_176_ = l_instDecidableEqList___redArg(v___f_175_, v_inputs_171_, v_inputs_173_);
if (v___x_176_ == 0)
{
lean_dec(v_outputs_174_);
lean_dec(v_outputs_172_);
return v___x_176_;
}
else
{
uint8_t v___x_177_; 
v___x_177_ = l_instDecidableEqList___redArg(v___f_175_, v_outputs_172_, v_outputs_174_);
return v___x_177_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq___boxed(lean_object* v_x_178_, lean_object* v_x_179_){
_start:
{
uint8_t v_res_180_; lean_object* v_r_181_; 
v_res_180_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq(v_x_178_, v_x_179_);
v_r_181_ = lean_box(v_res_180_);
return v_r_181_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface(lean_object* v_x_182_, lean_object* v_x_183_){
_start:
{
uint8_t v___x_184_; 
v___x_184_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq(v_x_182_, v_x_183_);
return v___x_184_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface___boxed(lean_object* v_x_185_, lean_object* v_x_186_){
_start:
{
uint8_t v_res_187_; lean_object* v_r_188_; 
v_res_187_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface(v_x_185_, v_x_186_);
v_r_188_ = lean_box(v_res_187_);
return v_r_188_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___lam__0(lean_object* v_a_189_, lean_object* v_b_190_){
_start:
{
lean_object* v___x_191_; lean_object* v___x_192_; uint8_t v___x_193_; 
v___x_191_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_192_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Graph_instDecidableEqCell___boxed), 2, 0);
v___x_193_ = l_instDecidableEqProd___redArg(v___x_191_, v___x_192_, v_a_189_, v_b_190_);
return v___x_193_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___lam__0___boxed(lean_object* v_a_194_, lean_object* v_b_195_){
_start:
{
uint8_t v_res_196_; lean_object* v_r_197_; 
v_res_196_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___lam__0(v_a_194_, v_b_195_);
v_r_197_ = lean_box(v_res_196_);
return v_r_197_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq(lean_object* v_x_199_, lean_object* v_x_200_){
_start:
{
lean_object* v_cells_201_; lean_object* v_edges_202_; lean_object* v_interface_203_; lean_object* v_cells_204_; lean_object* v_edges_205_; lean_object* v_interface_206_; lean_object* v___f_207_; uint8_t v___x_208_; 
v_cells_201_ = lean_ctor_get(v_x_199_, 0);
lean_inc(v_cells_201_);
v_edges_202_ = lean_ctor_get(v_x_199_, 1);
lean_inc(v_edges_202_);
v_interface_203_ = lean_ctor_get(v_x_199_, 2);
lean_inc_ref(v_interface_203_);
lean_dec_ref(v_x_199_);
v_cells_204_ = lean_ctor_get(v_x_200_, 0);
lean_inc(v_cells_204_);
v_edges_205_ = lean_ctor_get(v_x_200_, 1);
lean_inc(v_edges_205_);
v_interface_206_ = lean_ctor_get(v_x_200_, 2);
lean_inc_ref(v_interface_206_);
lean_dec_ref(v_x_200_);
v___f_207_ = ((lean_object*)(lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___closed__0));
v___x_208_ = l_instDecidableEqList___redArg(v___f_207_, v_cells_201_, v_cells_204_);
if (v___x_208_ == 0)
{
lean_dec_ref(v_interface_206_);
lean_dec(v_edges_205_);
lean_dec_ref(v_interface_203_);
lean_dec(v_edges_202_);
return v___x_208_;
}
else
{
lean_object* v___x_209_; uint8_t v___x_210_; 
v___x_209_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Graph_instDecidableEqEdge___boxed), 2, 0);
v___x_210_ = l_instDecidableEqList___redArg(v___x_209_, v_edges_202_, v_edges_205_);
if (v___x_210_ == 0)
{
lean_dec_ref(v_interface_206_);
lean_dec_ref(v_interface_203_);
return v___x_210_;
}
else
{
uint8_t v___x_211_; 
v___x_211_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqInterface_decEq(v_interface_203_, v_interface_206_);
return v___x_211_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq___boxed(lean_object* v_x_212_, lean_object* v_x_213_){
_start:
{
uint8_t v_res_214_; lean_object* v_r_215_; 
v_res_214_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq(v_x_212_, v_x_213_);
v_r_215_ = lean_box(v_res_214_);
return v_r_215_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph(lean_object* v_x_216_, lean_object* v_x_217_){
_start:
{
uint8_t v___x_218_; 
v___x_218_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph_decEq(v_x_216_, v_x_217_);
return v___x_218_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph___boxed(lean_object* v_x_219_, lean_object* v_x_220_){
_start:
{
uint8_t v_res_221_; lean_object* v_r_222_; 
v_res_221_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGraph(v_x_219_, v_x_220_);
v_r_222_ = lean_box(v_res_221_);
return v_r_222_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownInput(lean_object* v_cells_223_, lean_object* v_endpoint_224_){
_start:
{
lean_object* v_cell_225_; lean_object* v_port_226_; lean_object* v___x_227_; 
v_cell_225_ = lean_ctor_get(v_endpoint_224_, 0);
v_port_226_ = lean_ctor_get(v_endpoint_224_, 1);
v___x_227_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_cells_223_, v_cell_225_);
if (lean_obj_tag(v___x_227_) == 0)
{
lean_object* v___x_228_; 
v___x_228_ = lean_box(0);
return v___x_228_;
}
else
{
lean_object* v_val_229_; lean_object* v_inputs_230_; lean_object* v___x_231_; 
v_val_229_ = lean_ctor_get(v___x_227_, 0);
lean_inc(v_val_229_);
lean_dec_ref_known(v___x_227_, 1);
v_inputs_230_ = lean_ctor_get(v_val_229_, 0);
lean_inc(v_inputs_230_);
lean_dec(v_val_229_);
v___x_231_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_inputs_230_, v_port_226_);
lean_dec(v_inputs_230_);
return v___x_231_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownInput___boxed(lean_object* v_cells_232_, lean_object* v_endpoint_233_){
_start:
{
lean_object* v_res_234_; 
v_res_234_ = lp_algalVerification_Algal_Core_Graph_ownInput(v_cells_232_, v_endpoint_233_);
lean_dec_ref(v_endpoint_233_);
lean_dec(v_cells_232_);
return v_res_234_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownOutput(lean_object* v_cells_235_, lean_object* v_endpoint_236_){
_start:
{
lean_object* v_cell_237_; lean_object* v_port_238_; lean_object* v___x_239_; 
v_cell_237_ = lean_ctor_get(v_endpoint_236_, 0);
v_port_238_ = lean_ctor_get(v_endpoint_236_, 1);
v___x_239_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_cells_235_, v_cell_237_);
if (lean_obj_tag(v___x_239_) == 0)
{
lean_object* v___x_240_; 
v___x_240_ = lean_box(0);
return v___x_240_;
}
else
{
lean_object* v_val_241_; lean_object* v_outputs_242_; lean_object* v___x_243_; 
v_val_241_ = lean_ctor_get(v___x_239_, 0);
lean_inc(v_val_241_);
lean_dec_ref_known(v___x_239_, 1);
v_outputs_242_ = lean_ctor_get(v_val_241_, 1);
lean_inc(v_outputs_242_);
lean_dec(v_val_241_);
v___x_243_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_outputs_242_, v_port_238_);
lean_dec(v_outputs_242_);
return v___x_243_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_ownOutput___boxed(lean_object* v_cells_244_, lean_object* v_endpoint_245_){
_start:
{
lean_object* v_res_246_; 
v_res_246_ = lp_algalVerification_Algal_Core_Graph_ownOutput(v_cells_244_, v_endpoint_245_);
lean_dec_ref(v_endpoint_245_);
lean_dec(v_cells_244_);
return v_res_246_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_interfaceInput(lean_object* v_cells_247_, lean_object* v_endpoint_248_){
_start:
{
lean_object* v_cell_249_; lean_object* v_port_250_; lean_object* v___x_251_; 
v_cell_249_ = lean_ctor_get(v_endpoint_248_, 0);
v_port_250_ = lean_ctor_get(v_endpoint_248_, 1);
v___x_251_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_cells_247_, v_cell_249_);
if (lean_obj_tag(v___x_251_) == 0)
{
lean_object* v___x_252_; 
v___x_252_ = lean_box(0);
return v___x_252_;
}
else
{
lean_object* v_val_253_; uint8_t v_inputCell_254_; 
v_val_253_ = lean_ctor_get(v___x_251_, 0);
lean_inc(v_val_253_);
lean_dec_ref_known(v___x_251_, 1);
v_inputCell_254_ = lean_ctor_get_uint8(v_val_253_, sizeof(void*)*2);
if (v_inputCell_254_ == 0)
{
lean_object* v___x_255_; 
lean_dec(v_val_253_);
v___x_255_ = lean_box(0);
return v___x_255_;
}
else
{
lean_object* v_outputs_256_; lean_object* v___x_257_; 
v_outputs_256_ = lean_ctor_get(v_val_253_, 1);
lean_inc(v_outputs_256_);
lean_dec(v_val_253_);
v___x_257_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_outputs_256_, v_port_250_);
lean_dec(v_outputs_256_);
return v___x_257_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_interfaceInput___boxed(lean_object* v_cells_258_, lean_object* v_endpoint_259_){
_start:
{
lean_object* v_res_260_; 
v_res_260_ = lp_algalVerification_Algal_Core_Graph_interfaceInput(v_cells_258_, v_endpoint_259_);
lean_dec_ref(v_endpoint_259_);
lean_dec(v_cells_258_);
return v_res_260_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_guardValid(lean_object* v_producer_261_, lean_object* v_x_262_){
_start:
{
switch(lean_obj_tag(v_x_262_))
{
case 2:
{
lean_object* v_kind_263_; lean_object* v___x_264_; uint8_t v___x_265_; 
v_kind_263_ = lean_ctor_get(v_producer_261_, 0);
v___x_264_ = lean_box(1);
v___x_265_ = lp_algalVerification_Algal_Core_Ports_instDecidableEqKind_decEq(v_kind_263_, v___x_264_);
return v___x_265_;
}
case 3:
{
lean_object* v_value_266_; lean_object* v_kind_267_; lean_object* v_labels_268_; lean_object* v___x_269_; uint8_t v___x_270_; 
v_value_266_ = lean_ctor_get(v_x_262_, 0);
v_kind_267_ = lean_ctor_get(v_producer_261_, 0);
v_labels_268_ = lean_ctor_get(v_producer_261_, 1);
v___x_269_ = lean_box(2);
v___x_270_ = lp_algalVerification_Algal_Core_Ports_instDecidableEqKind_decEq(v_kind_267_, v___x_269_);
if (v___x_270_ == 0)
{
return v___x_270_;
}
else
{
if (lean_obj_tag(v_labels_268_) == 0)
{
return v___x_270_;
}
else
{
lean_object* v_val_271_; uint8_t v___x_272_; 
v_val_271_ = lean_ctor_get(v_labels_268_, 0);
v___x_272_ = lp_algalVerification_List_elem___at___00Algal_Core_Ports_labelsCompatible_spec__0(v_value_266_, v_val_271_);
return v___x_272_;
}
}
}
default: 
{
uint8_t v___x_273_; 
v___x_273_ = 1;
return v___x_273_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_guardValid___boxed(lean_object* v_producer_274_, lean_object* v_x_275_){
_start:
{
uint8_t v_res_276_; lean_object* v_r_277_; 
v_res_276_ = lp_algalVerification_Algal_Core_Graph_guardValid(v_producer_274_, v_x_275_);
lean_dec(v_x_275_);
lean_dec_ref(v_producer_274_);
v_r_277_ = lean_box(v_res_276_);
return v_r_277_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_edgeValid(lean_object* v_cells_278_, lean_object* v_edge_279_){
_start:
{
lean_object* v_source_280_; lean_object* v_target_281_; uint8_t v_onFail_282_; lean_object* v_guard_283_; lean_object* v___x_284_; 
v_source_280_ = lean_ctor_get(v_edge_279_, 0);
v_target_281_ = lean_ctor_get(v_edge_279_, 1);
v_onFail_282_ = lean_ctor_get_uint8(v_edge_279_, sizeof(void*)*3);
v_guard_283_ = lean_ctor_get(v_edge_279_, 2);
v___x_284_ = lp_algalVerification_Algal_Core_Graph_ownOutput(v_cells_278_, v_source_280_);
if (lean_obj_tag(v___x_284_) == 1)
{
lean_object* v_val_285_; lean_object* v___x_286_; 
v_val_285_ = lean_ctor_get(v___x_284_, 0);
lean_inc(v_val_285_);
lean_dec_ref_known(v___x_284_, 1);
v___x_286_ = lp_algalVerification_Algal_Core_Graph_ownInput(v_cells_278_, v_target_281_);
if (lean_obj_tag(v___x_286_) == 1)
{
if (v_onFail_282_ == 0)
{
lean_object* v_val_287_; uint8_t v___x_288_; 
v_val_287_ = lean_ctor_get(v___x_286_, 0);
lean_inc(v_val_287_);
lean_dec_ref_known(v___x_286_, 1);
v___x_288_ = lp_algalVerification_Algal_Core_Ports_compatible(v_val_285_, v_val_287_);
lean_dec(v_val_287_);
if (v___x_288_ == 0)
{
lean_dec(v_val_285_);
return v___x_288_;
}
else
{
uint8_t v___x_289_; 
v___x_289_ = lp_algalVerification_Algal_Core_Graph_guardValid(v_val_285_, v_guard_283_);
lean_dec(v_val_285_);
return v___x_289_;
}
}
else
{
lean_object* v_val_290_; lean_object* v___x_291_; uint8_t v___x_292_; 
lean_dec(v_val_285_);
v_val_290_ = lean_ctor_get(v___x_286_, 0);
lean_inc(v_val_290_);
lean_dec_ref_known(v___x_286_, 1);
v___x_291_ = lean_box(0);
v___x_292_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqGuard_decEq(v_guard_283_, v___x_291_);
if (v___x_292_ == 0)
{
lean_dec(v_val_290_);
return v___x_292_;
}
else
{
lean_object* v_kind_293_; lean_object* v___x_294_; uint8_t v___x_295_; 
v_kind_293_ = lean_ctor_get(v_val_290_, 0);
lean_inc(v_kind_293_);
lean_dec(v_val_290_);
v___x_294_ = lean_box(1);
v___x_295_ = lp_algalVerification_Algal_Core_Ports_instDecidableEqKind_decEq(v_kind_293_, v___x_294_);
lean_dec(v_kind_293_);
if (v___x_295_ == 0)
{
return v___x_295_;
}
else
{
return v_onFail_282_;
}
}
}
}
else
{
uint8_t v___x_296_; 
lean_dec(v___x_286_);
lean_dec(v_val_285_);
v___x_296_ = 0;
return v___x_296_;
}
}
else
{
uint8_t v___x_297_; 
lean_dec(v___x_284_);
v___x_297_ = 0;
return v___x_297_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_edgeValid___boxed(lean_object* v_cells_298_, lean_object* v_edge_299_){
_start:
{
uint8_t v_res_300_; lean_object* v_r_301_; 
v_res_300_ = lp_algalVerification_Algal_Core_Graph_edgeValid(v_cells_298_, v_edge_299_);
lean_dec_ref(v_edge_299_);
lean_dec(v_cells_298_);
v_r_301_ = lean_box(v_res_300_);
return v_r_301_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_rank(lean_object* v_ranks_302_, lean_object* v_cell_303_){
_start:
{
lean_object* v___x_304_; 
v___x_304_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_ranks_302_, v_cell_303_);
if (lean_obj_tag(v___x_304_) == 0)
{
lean_object* v___x_305_; 
v___x_305_ = lean_unsigned_to_nat(0u);
return v___x_305_;
}
else
{
lean_object* v_val_306_; 
v_val_306_ = lean_ctor_get(v___x_304_, 0);
lean_inc(v_val_306_);
lean_dec_ref_known(v___x_304_, 1);
return v_val_306_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_rank___boxed(lean_object* v_ranks_307_, lean_object* v_cell_308_){
_start:
{
lean_object* v_res_309_; 
v_res_309_ = lp_algalVerification_Algal_Core_Graph_rank(v_ranks_307_, v_cell_308_);
lean_dec_ref(v_cell_308_);
lean_dec(v_ranks_307_);
return v_res_309_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_rankValid(lean_object* v_ranks_310_, lean_object* v_edge_311_){
_start:
{
lean_object* v_source_312_; lean_object* v_target_313_; lean_object* v_cell_314_; lean_object* v_cell_315_; lean_object* v___x_316_; lean_object* v___x_317_; uint8_t v___x_318_; 
v_source_312_ = lean_ctor_get(v_edge_311_, 0);
v_target_313_ = lean_ctor_get(v_edge_311_, 1);
v_cell_314_ = lean_ctor_get(v_source_312_, 0);
v_cell_315_ = lean_ctor_get(v_target_313_, 0);
v___x_316_ = lp_algalVerification_Algal_Core_Graph_rank(v_ranks_310_, v_cell_314_);
v___x_317_ = lp_algalVerification_Algal_Core_Graph_rank(v_ranks_310_, v_cell_315_);
v___x_318_ = lean_nat_dec_lt(v___x_316_, v___x_317_);
lean_dec(v___x_317_);
lean_dec(v___x_316_);
return v___x_318_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_rankValid___boxed(lean_object* v_ranks_319_, lean_object* v_edge_320_){
_start:
{
uint8_t v_res_321_; lean_object* v_r_322_; 
v_res_321_ = lp_algalVerification_Algal_Core_Graph_rankValid(v_ranks_319_, v_edge_320_);
lean_dec_ref(v_edge_320_);
lean_dec(v_ranks_319_);
v_r_322_ = lean_box(v_res_321_);
return v_r_322_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Core_Graph_inbound_spec__0(lean_object* v_target_323_, lean_object* v_a_324_, lean_object* v_a_325_){
_start:
{
if (lean_obj_tag(v_a_324_) == 0)
{
lean_object* v___x_326_; 
v___x_326_ = l_List_reverse___redArg(v_a_325_);
return v___x_326_;
}
else
{
lean_object* v_head_327_; lean_object* v_tail_328_; lean_object* v___x_330_; uint8_t v_isShared_331_; uint8_t v_isSharedCheck_339_; 
v_head_327_ = lean_ctor_get(v_a_324_, 0);
v_tail_328_ = lean_ctor_get(v_a_324_, 1);
v_isSharedCheck_339_ = !lean_is_exclusive(v_a_324_);
if (v_isSharedCheck_339_ == 0)
{
v___x_330_ = v_a_324_;
v_isShared_331_ = v_isSharedCheck_339_;
goto v_resetjp_329_;
}
else
{
lean_inc(v_tail_328_);
lean_inc(v_head_327_);
lean_dec(v_a_324_);
v___x_330_ = lean_box(0);
v_isShared_331_ = v_isSharedCheck_339_;
goto v_resetjp_329_;
}
v_resetjp_329_:
{
lean_object* v_target_332_; uint8_t v___x_333_; 
v_target_332_ = lean_ctor_get(v_head_327_, 1);
v___x_333_ = lp_algalVerification_Algal_Core_Graph_instDecidableEqEndpoint_decEq(v_target_332_, v_target_323_);
if (v___x_333_ == 0)
{
lean_del_object(v___x_330_);
lean_dec(v_head_327_);
v_a_324_ = v_tail_328_;
goto _start;
}
else
{
lean_object* v___x_336_; 
if (v_isShared_331_ == 0)
{
lean_ctor_set(v___x_330_, 1, v_a_325_);
v___x_336_ = v___x_330_;
goto v_reusejp_335_;
}
else
{
lean_object* v_reuseFailAlloc_338_; 
v_reuseFailAlloc_338_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_338_, 0, v_head_327_);
lean_ctor_set(v_reuseFailAlloc_338_, 1, v_a_325_);
v___x_336_ = v_reuseFailAlloc_338_;
goto v_reusejp_335_;
}
v_reusejp_335_:
{
v_a_324_ = v_tail_328_;
v_a_325_ = v___x_336_;
goto _start;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_filterTR_loop___at___00Algal_Core_Graph_inbound_spec__0___boxed(lean_object* v_target_340_, lean_object* v_a_341_, lean_object* v_a_342_){
_start:
{
lean_object* v_res_343_; 
v_res_343_ = lp_algalVerification_List_filterTR_loop___at___00Algal_Core_Graph_inbound_spec__0(v_target_340_, v_a_341_, v_a_342_);
lean_dec_ref(v_target_340_);
return v_res_343_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_inbound(lean_object* v_edges_344_, lean_object* v_target_345_){
_start:
{
lean_object* v___x_346_; lean_object* v___x_347_; 
v___x_346_ = lean_box(0);
v___x_347_ = lp_algalVerification_List_filterTR_loop___at___00Algal_Core_Graph_inbound_spec__0(v_target_345_, v_edges_344_, v___x_346_);
return v___x_347_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_inbound___boxed(lean_object* v_edges_348_, lean_object* v_target_349_){
_start:
{
lean_object* v_res_350_; 
v_res_350_ = lp_algalVerification_Algal_Core_Graph_inbound(v_edges_348_, v_target_349_);
lean_dec_ref(v_target_349_);
return v_res_350_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_cardinalityValid_spec__0(lean_object* v_edge_351_, lean_object* v_x_352_){
_start:
{
if (lean_obj_tag(v_x_352_) == 0)
{
uint8_t v___x_353_; 
v___x_353_ = 1;
return v___x_353_;
}
else
{
lean_object* v_head_354_; uint8_t v_onFail_355_; 
v_head_354_ = lean_ctor_get(v_x_352_, 0);
v_onFail_355_ = lean_ctor_get_uint8(v_head_354_, sizeof(void*)*3);
if (v_onFail_355_ == 0)
{
uint8_t v_onFail_356_; 
v_onFail_356_ = lean_ctor_get_uint8(v_edge_351_, sizeof(void*)*3);
if (v_onFail_356_ == 0)
{
lean_object* v_tail_357_; 
v_tail_357_ = lean_ctor_get(v_x_352_, 1);
v_x_352_ = v_tail_357_;
goto _start;
}
else
{
return v_onFail_355_;
}
}
else
{
uint8_t v_onFail_359_; 
v_onFail_359_ = lean_ctor_get_uint8(v_edge_351_, sizeof(void*)*3);
if (v_onFail_359_ == 0)
{
return v_onFail_359_;
}
else
{
lean_object* v_tail_360_; 
v_tail_360_ = lean_ctor_get(v_x_352_, 1);
v_x_352_ = v_tail_360_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_cardinalityValid_spec__0___boxed(lean_object* v_edge_362_, lean_object* v_x_363_){
_start:
{
uint8_t v_res_364_; lean_object* v_r_365_; 
v_res_364_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_cardinalityValid_spec__0(v_edge_362_, v_x_363_);
lean_dec(v_x_363_);
lean_dec_ref(v_edge_362_);
v_r_365_ = lean_box(v_res_364_);
return v_r_365_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_cardinalityValid(lean_object* v_cells_366_, lean_object* v_edges_367_, lean_object* v_edge_368_){
_start:
{
lean_object* v_target_369_; lean_object* v___x_373_; 
v_target_369_ = lean_ctor_get(v_edge_368_, 1);
v___x_373_ = lp_algalVerification_Algal_Core_Graph_ownInput(v_cells_366_, v_target_369_);
if (lean_obj_tag(v___x_373_) == 0)
{
uint8_t v___x_374_; 
lean_dec(v_edges_367_);
v___x_374_ = 0;
return v___x_374_;
}
else
{
lean_object* v_val_375_; uint8_t v_many_376_; 
v_val_375_ = lean_ctor_get(v___x_373_, 0);
lean_inc(v_val_375_);
lean_dec_ref_known(v___x_373_, 1);
v_many_376_ = lean_ctor_get_uint8(v_val_375_, sizeof(void*)*3);
lean_dec(v_val_375_);
if (v_many_376_ == 0)
{
lean_object* v___x_377_; lean_object* v___x_378_; lean_object* v___x_379_; uint8_t v___x_380_; 
lean_inc(v_edges_367_);
v___x_377_ = lp_algalVerification_Algal_Core_Graph_inbound(v_edges_367_, v_target_369_);
v___x_378_ = l_List_lengthTR___redArg(v___x_377_);
lean_dec(v___x_377_);
v___x_379_ = lean_unsigned_to_nat(1u);
v___x_380_ = lean_nat_dec_le(v___x_378_, v___x_379_);
lean_dec(v___x_378_);
if (v___x_380_ == 0)
{
lean_dec(v_edges_367_);
return v___x_380_;
}
else
{
goto v___jp_370_;
}
}
else
{
goto v___jp_370_;
}
}
v___jp_370_:
{
lean_object* v___x_371_; uint8_t v___x_372_; 
v___x_371_ = lp_algalVerification_Algal_Core_Graph_inbound(v_edges_367_, v_target_369_);
v___x_372_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_cardinalityValid_spec__0(v_edge_368_, v___x_371_);
lean_dec(v___x_371_);
return v___x_372_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_cardinalityValid___boxed(lean_object* v_cells_381_, lean_object* v_edges_382_, lean_object* v_edge_383_){
_start:
{
uint8_t v_res_384_; lean_object* v_r_385_; 
v_res_384_ = lp_algalVerification_Algal_Core_Graph_cardinalityValid(v_cells_381_, v_edges_382_, v_edge_383_);
lean_dec_ref(v_edge_383_);
lean_dec(v_cells_381_);
v_r_385_ = lean_box(v_res_384_);
return v_r_385_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_Graph_uniqueNames_spec__0___redArg(lean_object* v_a_386_, lean_object* v_a_387_){
_start:
{
if (lean_obj_tag(v_a_386_) == 0)
{
lean_object* v___x_388_; 
v___x_388_ = l_List_reverse___redArg(v_a_387_);
return v___x_388_;
}
else
{
lean_object* v_head_389_; lean_object* v_tail_390_; lean_object* v___x_392_; uint8_t v_isShared_393_; uint8_t v_isSharedCheck_399_; 
v_head_389_ = lean_ctor_get(v_a_386_, 0);
v_tail_390_ = lean_ctor_get(v_a_386_, 1);
v_isSharedCheck_399_ = !lean_is_exclusive(v_a_386_);
if (v_isSharedCheck_399_ == 0)
{
v___x_392_ = v_a_386_;
v_isShared_393_ = v_isSharedCheck_399_;
goto v_resetjp_391_;
}
else
{
lean_inc(v_tail_390_);
lean_inc(v_head_389_);
lean_dec(v_a_386_);
v___x_392_ = lean_box(0);
v_isShared_393_ = v_isSharedCheck_399_;
goto v_resetjp_391_;
}
v_resetjp_391_:
{
lean_object* v_fst_394_; lean_object* v___x_396_; 
v_fst_394_ = lean_ctor_get(v_head_389_, 0);
lean_inc(v_fst_394_);
lean_dec(v_head_389_);
if (v_isShared_393_ == 0)
{
lean_ctor_set(v___x_392_, 1, v_a_387_);
lean_ctor_set(v___x_392_, 0, v_fst_394_);
v___x_396_ = v___x_392_;
goto v_reusejp_395_;
}
else
{
lean_object* v_reuseFailAlloc_398_; 
v_reuseFailAlloc_398_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_398_, 0, v_fst_394_);
lean_ctor_set(v_reuseFailAlloc_398_, 1, v_a_387_);
v___x_396_ = v_reuseFailAlloc_398_;
goto v_reusejp_395_;
}
v_reusejp_395_:
{
v_a_386_ = v_tail_390_;
v_a_387_ = v___x_396_;
goto _start;
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(lean_object* v_entries_400_){
_start:
{
lean_object* v___x_401_; lean_object* v___x_402_; lean_object* v___x_403_; uint8_t v___x_404_; 
v___x_401_ = lean_alloc_closure((void*)(l_instDecidableEqString___boxed), 2, 0);
v___x_402_ = lean_box(0);
v___x_403_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_Graph_uniqueNames_spec__0___redArg(v_entries_400_, v___x_402_);
v___x_404_ = l_List_nodupDecidable___redArg(v___x_401_, v___x_403_);
return v___x_404_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg___boxed(lean_object* v_entries_405_){
_start:
{
uint8_t v_res_406_; lean_object* v_r_407_; 
v_res_406_ = lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(v_entries_405_);
v_r_407_ = lean_box(v_res_406_);
return v_r_407_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_uniqueNames(lean_object* v_00_u03b1_408_, lean_object* v_entries_409_){
_start:
{
uint8_t v___x_410_; 
v___x_410_ = lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(v_entries_409_);
return v___x_410_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_uniqueNames___boxed(lean_object* v_00_u03b1_411_, lean_object* v_entries_412_){
_start:
{
uint8_t v_res_413_; lean_object* v_r_414_; 
v_res_413_ = lp_algalVerification_Algal_Core_Graph_uniqueNames(v_00_u03b1_411_, v_entries_412_);
v_r_414_ = lean_box(v_res_413_);
return v_r_414_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_Graph_uniqueNames_spec__0(lean_object* v_00_u03b1_415_, lean_object* v_a_416_, lean_object* v_a_417_){
_start:
{
lean_object* v___x_418_; 
v___x_418_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_Graph_uniqueNames_spec__0___redArg(v_a_416_, v_a_417_);
return v___x_418_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__1(lean_object* v_cells_419_, uint8_t v___x_420_, lean_object* v_x_421_){
_start:
{
if (lean_obj_tag(v_x_421_) == 0)
{
uint8_t v___x_422_; 
v___x_422_ = 1;
return v___x_422_;
}
else
{
lean_object* v_head_423_; lean_object* v_tail_424_; lean_object* v_snd_425_; lean_object* v___x_426_; 
v_head_423_ = lean_ctor_get(v_x_421_, 0);
v_tail_424_ = lean_ctor_get(v_x_421_, 1);
v_snd_425_ = lean_ctor_get(v_head_423_, 1);
v___x_426_ = lp_algalVerification_Algal_Core_Graph_ownOutput(v_cells_419_, v_snd_425_);
if (lean_obj_tag(v___x_426_) == 0)
{
uint8_t v___x_427_; 
v___x_427_ = 0;
return v___x_427_;
}
else
{
lean_dec_ref_known(v___x_426_, 1);
if (v___x_420_ == 0)
{
return v___x_420_;
}
else
{
v_x_421_ = v_tail_424_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__1___boxed(lean_object* v_cells_429_, lean_object* v___x_430_, lean_object* v_x_431_){
_start:
{
uint8_t v___x_156__boxed_432_; uint8_t v_res_433_; lean_object* v_r_434_; 
v___x_156__boxed_432_ = lean_unbox(v___x_430_);
v_res_433_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__1(v_cells_429_, v___x_156__boxed_432_, v_x_431_);
lean_dec(v_x_431_);
lean_dec(v_cells_429_);
v_r_434_ = lean_box(v_res_433_);
return v_r_434_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__0(lean_object* v_cells_435_, uint8_t v___y_436_, lean_object* v_x_437_){
_start:
{
if (lean_obj_tag(v_x_437_) == 0)
{
uint8_t v___x_438_; 
v___x_438_ = 1;
return v___x_438_;
}
else
{
lean_object* v_head_439_; lean_object* v_tail_440_; lean_object* v_snd_441_; lean_object* v___x_442_; 
v_head_439_ = lean_ctor_get(v_x_437_, 0);
v_tail_440_ = lean_ctor_get(v_x_437_, 1);
v_snd_441_ = lean_ctor_get(v_head_439_, 1);
v___x_442_ = lp_algalVerification_Algal_Core_Graph_interfaceInput(v_cells_435_, v_snd_441_);
if (lean_obj_tag(v___x_442_) == 0)
{
uint8_t v___x_443_; 
v___x_443_ = 0;
return v___x_443_;
}
else
{
lean_dec_ref_known(v___x_442_, 1);
if (v___y_436_ == 0)
{
return v___y_436_;
}
else
{
v_x_437_ = v_tail_440_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__0___boxed(lean_object* v_cells_445_, lean_object* v___y_446_, lean_object* v_x_447_){
_start:
{
uint8_t v___y_174__boxed_448_; uint8_t v_res_449_; lean_object* v_r_450_; 
v___y_174__boxed_448_ = lean_unbox(v___y_446_);
v_res_449_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__0(v_cells_445_, v___y_174__boxed_448_, v_x_447_);
lean_dec(v_x_447_);
lean_dec(v_cells_445_);
v_r_450_ = lean_box(v_res_449_);
return v_r_450_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_interfaceValid(lean_object* v_cells_451_, lean_object* v_interface_452_){
_start:
{
lean_object* v_inputs_453_; lean_object* v_outputs_454_; uint8_t v___y_456_; uint8_t v___x_459_; 
v_inputs_453_ = lean_ctor_get(v_interface_452_, 0);
lean_inc_n(v_inputs_453_, 2);
v_outputs_454_ = lean_ctor_get(v_interface_452_, 1);
lean_inc(v_outputs_454_);
lean_dec_ref(v_interface_452_);
v___x_459_ = lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(v_inputs_453_);
if (v___x_459_ == 0)
{
v___y_456_ = v___x_459_;
goto v___jp_455_;
}
else
{
uint8_t v___x_460_; 
lean_inc(v_outputs_454_);
v___x_460_ = lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(v_outputs_454_);
v___y_456_ = v___x_460_;
goto v___jp_455_;
}
v___jp_455_:
{
if (v___y_456_ == 0)
{
lean_dec(v_outputs_454_);
lean_dec(v_inputs_453_);
return v___y_456_;
}
else
{
uint8_t v___x_457_; 
v___x_457_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__0(v_cells_451_, v___y_456_, v_inputs_453_);
lean_dec(v_inputs_453_);
if (v___x_457_ == 0)
{
lean_dec(v_outputs_454_);
return v___x_457_;
}
else
{
uint8_t v___x_458_; 
v___x_458_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_interfaceValid_spec__1(v_cells_451_, v___x_457_, v_outputs_454_);
lean_dec(v_outputs_454_);
return v___x_458_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_interfaceValid___boxed(lean_object* v_cells_461_, lean_object* v_interface_462_){
_start:
{
uint8_t v_res_463_; lean_object* v_r_464_; 
v_res_463_ = lp_algalVerification_Algal_Core_Graph_interfaceValid(v_cells_461_, v_interface_462_);
lean_dec(v_cells_461_);
v_r_464_ = lean_box(v_res_463_);
return v_r_464_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__3(lean_object* v_x_465_){
_start:
{
if (lean_obj_tag(v_x_465_) == 0)
{
uint8_t v___x_466_; 
v___x_466_ = 1;
return v___x_466_;
}
else
{
lean_object* v_head_467_; lean_object* v_tail_468_; uint8_t v___y_470_; lean_object* v_snd_472_; lean_object* v_inputs_473_; lean_object* v_outputs_474_; uint8_t v___x_475_; 
v_head_467_ = lean_ctor_get(v_x_465_, 0);
lean_inc(v_head_467_);
v_tail_468_ = lean_ctor_get(v_x_465_, 1);
lean_inc(v_tail_468_);
lean_dec_ref_known(v_x_465_, 2);
v_snd_472_ = lean_ctor_get(v_head_467_, 1);
lean_inc(v_snd_472_);
lean_dec(v_head_467_);
v_inputs_473_ = lean_ctor_get(v_snd_472_, 0);
lean_inc(v_inputs_473_);
v_outputs_474_ = lean_ctor_get(v_snd_472_, 1);
lean_inc(v_outputs_474_);
lean_dec(v_snd_472_);
v___x_475_ = lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(v_inputs_473_);
if (v___x_475_ == 0)
{
lean_dec(v_outputs_474_);
v___y_470_ = v___x_475_;
goto v___jp_469_;
}
else
{
uint8_t v___x_476_; 
v___x_476_ = lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(v_outputs_474_);
v___y_470_ = v___x_476_;
goto v___jp_469_;
}
v___jp_469_:
{
if (v___y_470_ == 0)
{
lean_dec(v_tail_468_);
return v___y_470_;
}
else
{
v_x_465_ = v_tail_468_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__3___boxed(lean_object* v_x_477_){
_start:
{
uint8_t v_res_478_; lean_object* v_r_479_; 
v_res_478_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__3(v_x_477_);
v_r_479_ = lean_box(v_res_478_);
return v_r_479_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__0(lean_object* v___x_480_, lean_object* v_x_481_){
_start:
{
if (lean_obj_tag(v_x_481_) == 0)
{
uint8_t v___x_482_; 
v___x_482_ = 1;
return v___x_482_;
}
else
{
lean_object* v_head_483_; lean_object* v_tail_484_; uint8_t v___x_485_; 
v_head_483_ = lean_ctor_get(v_x_481_, 0);
v_tail_484_ = lean_ctor_get(v_x_481_, 1);
v___x_485_ = lp_algalVerification_Algal_Core_Graph_edgeValid(v___x_480_, v_head_483_);
if (v___x_485_ == 0)
{
return v___x_485_;
}
else
{
v_x_481_ = v_tail_484_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__0___boxed(lean_object* v___x_487_, lean_object* v_x_488_){
_start:
{
uint8_t v_res_489_; lean_object* v_r_490_; 
v_res_489_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__0(v___x_487_, v_x_488_);
lean_dec(v_x_488_);
lean_dec(v___x_487_);
v_r_490_ = lean_box(v_res_489_);
return v_r_490_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__2(lean_object* v___x_491_, lean_object* v___x_492_, lean_object* v_x_493_){
_start:
{
if (lean_obj_tag(v_x_493_) == 0)
{
uint8_t v___x_494_; 
lean_dec(v___x_492_);
v___x_494_ = 1;
return v___x_494_;
}
else
{
lean_object* v_head_495_; lean_object* v_tail_496_; uint8_t v___x_497_; 
v_head_495_ = lean_ctor_get(v_x_493_, 0);
v_tail_496_ = lean_ctor_get(v_x_493_, 1);
lean_inc(v___x_492_);
v___x_497_ = lp_algalVerification_Algal_Core_Graph_cardinalityValid(v___x_491_, v___x_492_, v_head_495_);
if (v___x_497_ == 0)
{
lean_dec(v___x_492_);
return v___x_497_;
}
else
{
v_x_493_ = v_tail_496_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__2___boxed(lean_object* v___x_499_, lean_object* v___x_500_, lean_object* v_x_501_){
_start:
{
uint8_t v_res_502_; lean_object* v_r_503_; 
v_res_502_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__2(v___x_499_, v___x_500_, v_x_501_);
lean_dec(v_x_501_);
lean_dec(v___x_499_);
v_r_503_ = lean_box(v_res_502_);
return v_r_503_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__1(lean_object* v_ranks_504_, lean_object* v_x_505_){
_start:
{
if (lean_obj_tag(v_x_505_) == 0)
{
uint8_t v___x_506_; 
v___x_506_ = 1;
return v___x_506_;
}
else
{
lean_object* v_head_507_; lean_object* v_tail_508_; uint8_t v___x_509_; 
v_head_507_ = lean_ctor_get(v_x_505_, 0);
v_tail_508_ = lean_ctor_get(v_x_505_, 1);
v___x_509_ = lp_algalVerification_Algal_Core_Graph_rankValid(v_ranks_504_, v_head_507_);
if (v___x_509_ == 0)
{
return v___x_509_;
}
else
{
v_x_505_ = v_tail_508_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__1___boxed(lean_object* v_ranks_511_, lean_object* v_x_512_){
_start:
{
uint8_t v_res_513_; lean_object* v_r_514_; 
v_res_513_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__1(v_ranks_511_, v_x_512_);
lean_dec(v_x_512_);
lean_dec(v_ranks_511_);
v_r_514_ = lean_box(v_res_513_);
return v_r_514_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_checkCertificate(lean_object* v_graph_515_, lean_object* v_ranks_516_){
_start:
{
lean_object* v_cells_517_; lean_object* v_edges_518_; lean_object* v_interface_519_; uint8_t v___y_521_; uint8_t v___x_526_; 
v_cells_517_ = lean_ctor_get(v_graph_515_, 0);
lean_inc_n(v_cells_517_, 2);
v_edges_518_ = lean_ctor_get(v_graph_515_, 1);
lean_inc(v_edges_518_);
v_interface_519_ = lean_ctor_get(v_graph_515_, 2);
lean_inc_ref(v_interface_519_);
lean_dec_ref(v_graph_515_);
v___x_526_ = lp_algalVerification_Algal_Core_Graph_uniqueNames___redArg(v_cells_517_);
if (v___x_526_ == 0)
{
v___y_521_ = v___x_526_;
goto v___jp_520_;
}
else
{
uint8_t v___x_527_; 
lean_inc(v_cells_517_);
v___x_527_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__3(v_cells_517_);
v___y_521_ = v___x_527_;
goto v___jp_520_;
}
v___jp_520_:
{
if (v___y_521_ == 0)
{
lean_dec_ref(v_interface_519_);
lean_dec(v_edges_518_);
lean_dec(v_cells_517_);
return v___y_521_;
}
else
{
uint8_t v___x_522_; 
v___x_522_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__0(v_cells_517_, v_edges_518_);
if (v___x_522_ == 0)
{
lean_dec_ref(v_interface_519_);
lean_dec(v_edges_518_);
lean_dec(v_cells_517_);
return v___x_522_;
}
else
{
uint8_t v___x_523_; 
v___x_523_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__1(v_ranks_516_, v_edges_518_);
if (v___x_523_ == 0)
{
lean_dec_ref(v_interface_519_);
lean_dec(v_edges_518_);
lean_dec(v_cells_517_);
return v___x_523_;
}
else
{
uint8_t v___x_524_; 
lean_inc(v_edges_518_);
v___x_524_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_checkCertificate_spec__2(v_cells_517_, v_edges_518_, v_edges_518_);
lean_dec(v_edges_518_);
if (v___x_524_ == 0)
{
lean_dec_ref(v_interface_519_);
lean_dec(v_cells_517_);
return v___x_524_;
}
else
{
uint8_t v___x_525_; 
v___x_525_ = lp_algalVerification_Algal_Core_Graph_interfaceValid(v_cells_517_, v_interface_519_);
lean_dec(v_cells_517_);
return v___x_525_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_checkCertificate___boxed(lean_object* v_graph_528_, lean_object* v_ranks_529_){
_start:
{
uint8_t v_res_530_; lean_object* v_r_531_; 
v_res_530_ = lp_algalVerification_Algal_Core_Graph_checkCertificate(v_graph_528_, v_ranks_529_);
lean_dec(v_ranks_529_);
v_r_531_ = lean_box(v_res_530_);
return v_r_531_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_edgeValid_match__1_splitter___redArg(lean_object* v_x_532_, lean_object* v_x_533_, lean_object* v_h__1_534_, lean_object* v_h__2_535_){
_start:
{
if (lean_obj_tag(v_x_532_) == 1)
{
if (lean_obj_tag(v_x_533_) == 1)
{
lean_object* v_val_536_; lean_object* v_val_537_; lean_object* v___x_538_; 
lean_dec(v_h__2_535_);
v_val_536_ = lean_ctor_get(v_x_532_, 0);
lean_inc(v_val_536_);
lean_dec_ref_known(v_x_532_, 1);
v_val_537_ = lean_ctor_get(v_x_533_, 0);
lean_inc(v_val_537_);
lean_dec_ref_known(v_x_533_, 1);
v___x_538_ = lean_apply_2(v_h__1_534_, v_val_536_, v_val_537_);
return v___x_538_;
}
else
{
lean_object* v___x_539_; 
lean_dec(v_h__1_534_);
v___x_539_ = lean_apply_3(v_h__2_535_, v_x_532_, v_x_533_, lean_box(0));
return v___x_539_;
}
}
else
{
lean_object* v___x_540_; 
lean_dec(v_h__1_534_);
v___x_540_ = lean_apply_3(v_h__2_535_, v_x_532_, v_x_533_, lean_box(0));
return v___x_540_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_edgeValid_match__1_splitter(lean_object* v_motive_541_, lean_object* v_x_542_, lean_object* v_x_543_, lean_object* v_h__1_544_, lean_object* v_h__2_545_){
_start:
{
if (lean_obj_tag(v_x_542_) == 1)
{
if (lean_obj_tag(v_x_543_) == 1)
{
lean_object* v_val_546_; lean_object* v_val_547_; lean_object* v___x_548_; 
lean_dec(v_h__2_545_);
v_val_546_ = lean_ctor_get(v_x_542_, 0);
lean_inc(v_val_546_);
lean_dec_ref_known(v_x_542_, 1);
v_val_547_ = lean_ctor_get(v_x_543_, 0);
lean_inc(v_val_547_);
lean_dec_ref_known(v_x_543_, 1);
v___x_548_ = lean_apply_2(v_h__1_544_, v_val_546_, v_val_547_);
return v___x_548_;
}
else
{
lean_object* v___x_549_; 
lean_dec(v_h__1_544_);
v___x_549_ = lean_apply_3(v_h__2_545_, v_x_542_, v_x_543_, lean_box(0));
return v___x_549_;
}
}
else
{
lean_object* v___x_550_; 
lean_dec(v_h__1_544_);
v___x_550_ = lean_apply_3(v_h__2_545_, v_x_542_, v_x_543_, lean_box(0));
return v___x_550_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_cardinalityValid_match__1_splitter___redArg(lean_object* v_x_551_, lean_object* v_h__1_552_, lean_object* v_h__2_553_){
_start:
{
if (lean_obj_tag(v_x_551_) == 0)
{
lean_object* v___x_554_; lean_object* v___x_555_; 
lean_dec(v_h__2_553_);
v___x_554_ = lean_box(0);
v___x_555_ = lean_apply_1(v_h__1_552_, v___x_554_);
return v___x_555_;
}
else
{
lean_object* v_val_556_; lean_object* v___x_557_; 
lean_dec(v_h__1_552_);
v_val_556_ = lean_ctor_get(v_x_551_, 0);
lean_inc(v_val_556_);
lean_dec_ref_known(v_x_551_, 1);
v___x_557_ = lean_apply_1(v_h__2_553_, v_val_556_);
return v___x_557_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Graph_0__Algal_Core_Graph_cardinalityValid_match__1_splitter(lean_object* v_motive_558_, lean_object* v_x_559_, lean_object* v_h__1_560_, lean_object* v_h__2_561_){
_start:
{
if (lean_obj_tag(v_x_559_) == 0)
{
lean_object* v___x_562_; lean_object* v___x_563_; 
lean_dec(v_h__2_561_);
v___x_562_ = lean_box(0);
v___x_563_ = lean_apply_1(v_h__1_560_, v___x_562_);
return v___x_563_;
}
else
{
lean_object* v_val_564_; lean_object* v___x_565_; 
lean_dec(v_h__1_560_);
v_val_564_ = lean_ctor_get(v_x_559_, 0);
lean_inc(v_val_564_);
lean_dec_ref_known(v_x_559_, 1);
v___x_565_ = lean_apply_1(v_h__2_561_, v_val_564_);
return v___x_565_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedInput(lean_object* v_cells_566_, lean_object* v_interface_567_, lean_object* v_name_568_){
_start:
{
lean_object* v_inputs_569_; lean_object* v___x_570_; 
v_inputs_569_ = lean_ctor_get(v_interface_567_, 0);
v___x_570_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_inputs_569_, v_name_568_);
if (lean_obj_tag(v___x_570_) == 0)
{
lean_object* v___x_571_; 
v___x_571_ = lean_box(0);
return v___x_571_;
}
else
{
lean_object* v_val_572_; lean_object* v___x_573_; 
v_val_572_ = lean_ctor_get(v___x_570_, 0);
lean_inc(v_val_572_);
lean_dec_ref_known(v___x_570_, 1);
v___x_573_ = lp_algalVerification_Algal_Core_Graph_interfaceInput(v_cells_566_, v_val_572_);
lean_dec(v_val_572_);
return v___x_573_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedInput___boxed(lean_object* v_cells_574_, lean_object* v_interface_575_, lean_object* v_name_576_){
_start:
{
lean_object* v_res_577_; 
v_res_577_ = lp_algalVerification_Algal_Core_Graph_exposedInput(v_cells_574_, v_interface_575_, v_name_576_);
lean_dec_ref(v_name_576_);
lean_dec_ref(v_interface_575_);
lean_dec(v_cells_574_);
return v_res_577_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedOutput(lean_object* v_cells_578_, lean_object* v_interface_579_, lean_object* v_name_580_){
_start:
{
lean_object* v_outputs_581_; lean_object* v___x_582_; 
v_outputs_581_ = lean_ctor_get(v_interface_579_, 1);
v___x_582_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_outputs_581_, v_name_580_);
if (lean_obj_tag(v___x_582_) == 0)
{
lean_object* v___x_583_; 
v___x_583_ = lean_box(0);
return v___x_583_;
}
else
{
lean_object* v_val_584_; lean_object* v___x_585_; 
v_val_584_ = lean_ctor_get(v___x_582_, 0);
lean_inc(v_val_584_);
lean_dec_ref_known(v___x_582_, 1);
v___x_585_ = lp_algalVerification_Algal_Core_Graph_ownOutput(v_cells_578_, v_val_584_);
lean_dec(v_val_584_);
return v___x_585_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_exposedOutput___boxed(lean_object* v_cells_586_, lean_object* v_interface_587_, lean_object* v_name_588_){
_start:
{
lean_object* v_res_589_; 
v_res_589_ = lp_algalVerification_Algal_Core_Graph_exposedOutput(v_cells_586_, v_interface_587_, v_name_588_);
lean_dec_ref(v_name_588_);
lean_dec_ref(v_interface_587_);
lean_dec(v_cells_586_);
return v_res_589_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__0(lean_object* v_childCells_590_, lean_object* v_interface_591_, lean_object* v_x_592_){
_start:
{
if (lean_obj_tag(v_x_592_) == 0)
{
uint8_t v___x_593_; 
v___x_593_ = 1;
return v___x_593_;
}
else
{
lean_object* v_head_594_; lean_object* v_tail_595_; lean_object* v_fst_596_; lean_object* v_snd_597_; lean_object* v___x_598_; lean_object* v___x_599_; lean_object* v___x_600_; uint8_t v___x_601_; 
v_head_594_ = lean_ctor_get(v_x_592_, 0);
v_tail_595_ = lean_ctor_get(v_x_592_, 1);
v_fst_596_ = lean_ctor_get(v_head_594_, 0);
v_snd_597_ = lean_ctor_get(v_head_594_, 1);
v___x_598_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Ports_instDecidableEqPort___boxed), 2, 0);
v___x_599_ = lp_algalVerification_Algal_Core_Graph_exposedOutput(v_childCells_590_, v_interface_591_, v_fst_596_);
lean_inc(v_snd_597_);
v___x_600_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_600_, 0, v_snd_597_);
v___x_601_ = l_Option_instDecidableEq___redArg(v___x_598_, v___x_599_, v___x_600_);
if (v___x_601_ == 0)
{
return v___x_601_;
}
else
{
v_x_592_ = v_tail_595_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__0___boxed(lean_object* v_childCells_603_, lean_object* v_interface_604_, lean_object* v_x_605_){
_start:
{
uint8_t v_res_606_; lean_object* v_r_607_; 
v_res_606_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__0(v_childCells_603_, v_interface_604_, v_x_605_);
lean_dec(v_x_605_);
lean_dec_ref(v_interface_604_);
lean_dec(v_childCells_603_);
v_r_607_ = lean_box(v_res_606_);
return v_r_607_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__3(lean_object* v_childCells_608_, lean_object* v_interface_609_, lean_object* v_x_610_){
_start:
{
if (lean_obj_tag(v_x_610_) == 0)
{
uint8_t v___x_611_; 
v___x_611_ = 1;
return v___x_611_;
}
else
{
lean_object* v_head_612_; lean_object* v_tail_613_; lean_object* v_fst_614_; lean_object* v_snd_615_; lean_object* v___x_616_; lean_object* v___x_617_; lean_object* v___x_618_; uint8_t v___x_619_; 
v_head_612_ = lean_ctor_get(v_x_610_, 0);
v_tail_613_ = lean_ctor_get(v_x_610_, 1);
v_fst_614_ = lean_ctor_get(v_head_612_, 0);
v_snd_615_ = lean_ctor_get(v_head_612_, 1);
v___x_616_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_Ports_instDecidableEqPort___boxed), 2, 0);
v___x_617_ = lp_algalVerification_Algal_Core_Graph_exposedInput(v_childCells_608_, v_interface_609_, v_fst_614_);
lean_inc(v_snd_615_);
v___x_618_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_618_, 0, v_snd_615_);
v___x_619_ = l_Option_instDecidableEq___redArg(v___x_616_, v___x_617_, v___x_618_);
if (v___x_619_ == 0)
{
return v___x_619_;
}
else
{
v_x_610_ = v_tail_613_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__3___boxed(lean_object* v_childCells_621_, lean_object* v_interface_622_, lean_object* v_x_623_){
_start:
{
uint8_t v_res_624_; lean_object* v_r_625_; 
v_res_624_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__3(v_childCells_621_, v_interface_622_, v_x_623_);
lean_dec(v_x_623_);
lean_dec_ref(v_interface_622_);
lean_dec(v_childCells_621_);
v_r_625_ = lean_box(v_res_624_);
return v_r_625_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__2(lean_object* v_parent_626_, uint8_t v___x_627_, lean_object* v_x_628_){
_start:
{
if (lean_obj_tag(v_x_628_) == 0)
{
uint8_t v___x_629_; 
v___x_629_ = 1;
return v___x_629_;
}
else
{
lean_object* v_head_630_; lean_object* v_tail_631_; lean_object* v_outputs_632_; lean_object* v_fst_633_; lean_object* v___x_634_; 
v_head_630_ = lean_ctor_get(v_x_628_, 0);
v_tail_631_ = lean_ctor_get(v_x_628_, 1);
v_outputs_632_ = lean_ctor_get(v_parent_626_, 1);
v_fst_633_ = lean_ctor_get(v_head_630_, 0);
v___x_634_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_outputs_632_, v_fst_633_);
if (lean_obj_tag(v___x_634_) == 0)
{
uint8_t v___x_635_; 
v___x_635_ = 0;
return v___x_635_;
}
else
{
lean_dec_ref_known(v___x_634_, 1);
if (v___x_627_ == 0)
{
return v___x_627_;
}
else
{
v_x_628_ = v_tail_631_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__2___boxed(lean_object* v_parent_637_, lean_object* v___x_638_, lean_object* v_x_639_){
_start:
{
uint8_t v___x_325__boxed_640_; uint8_t v_res_641_; lean_object* v_r_642_; 
v___x_325__boxed_640_ = lean_unbox(v___x_638_);
v_res_641_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__2(v_parent_637_, v___x_325__boxed_640_, v_x_639_);
lean_dec(v_x_639_);
lean_dec_ref(v_parent_637_);
v_r_642_ = lean_box(v_res_641_);
return v_r_642_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__1(lean_object* v_parent_643_, uint8_t v___x_644_, lean_object* v_x_645_){
_start:
{
if (lean_obj_tag(v_x_645_) == 0)
{
uint8_t v___x_646_; 
v___x_646_ = 1;
return v___x_646_;
}
else
{
lean_object* v_head_647_; lean_object* v_tail_648_; lean_object* v_inputs_649_; lean_object* v_fst_650_; lean_object* v___x_651_; 
v_head_647_ = lean_ctor_get(v_x_645_, 0);
v_tail_648_ = lean_ctor_get(v_x_645_, 1);
v_inputs_649_ = lean_ctor_get(v_parent_643_, 0);
v_fst_650_ = lean_ctor_get(v_head_647_, 0);
v___x_651_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_inputs_649_, v_fst_650_);
if (lean_obj_tag(v___x_651_) == 0)
{
uint8_t v___x_652_; 
v___x_652_ = 0;
return v___x_652_;
}
else
{
lean_dec_ref_known(v___x_651_, 1);
if (v___x_644_ == 0)
{
return v___x_644_;
}
else
{
v_x_645_ = v_tail_648_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__1___boxed(lean_object* v_parent_654_, lean_object* v___x_655_, lean_object* v_x_656_){
_start:
{
uint8_t v___x_343__boxed_657_; uint8_t v_res_658_; lean_object* v_r_659_; 
v___x_343__boxed_657_ = lean_unbox(v___x_655_);
v_res_658_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__1(v_parent_654_, v___x_343__boxed_657_, v_x_656_);
lean_dec(v_x_656_);
lean_dec_ref(v_parent_654_);
v_r_659_ = lean_box(v_res_658_);
return v_r_659_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Graph_unliftedChildCorresponds(lean_object* v_childCells_660_, lean_object* v_interface_661_, lean_object* v_parent_662_){
_start:
{
uint8_t v___y_664_; uint8_t v___x_671_; 
lean_inc_ref(v_interface_661_);
v___x_671_ = lp_algalVerification_Algal_Core_Graph_interfaceValid(v_childCells_660_, v_interface_661_);
if (v___x_671_ == 0)
{
v___y_664_ = v___x_671_;
goto v___jp_663_;
}
else
{
lean_object* v_inputs_672_; uint8_t v___x_673_; 
v_inputs_672_ = lean_ctor_get(v_parent_662_, 0);
v___x_673_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__3(v_childCells_660_, v_interface_661_, v_inputs_672_);
v___y_664_ = v___x_673_;
goto v___jp_663_;
}
v___jp_663_:
{
if (v___y_664_ == 0)
{
lean_dec_ref(v_interface_661_);
return v___y_664_;
}
else
{
lean_object* v_outputs_665_; uint8_t v___x_666_; 
v_outputs_665_ = lean_ctor_get(v_parent_662_, 1);
v___x_666_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__0(v_childCells_660_, v_interface_661_, v_outputs_665_);
if (v___x_666_ == 0)
{
lean_dec_ref(v_interface_661_);
return v___x_666_;
}
else
{
lean_object* v_inputs_667_; lean_object* v_outputs_668_; uint8_t v___x_669_; 
v_inputs_667_ = lean_ctor_get(v_interface_661_, 0);
lean_inc(v_inputs_667_);
v_outputs_668_ = lean_ctor_get(v_interface_661_, 1);
lean_inc(v_outputs_668_);
lean_dec_ref(v_interface_661_);
v___x_669_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__1(v_parent_662_, v___x_666_, v_inputs_667_);
lean_dec(v_inputs_667_);
if (v___x_669_ == 0)
{
lean_dec(v_outputs_668_);
return v___x_669_;
}
else
{
uint8_t v___x_670_; 
v___x_670_ = lp_algalVerification_List_all___at___00Algal_Core_Graph_unliftedChildCorresponds_spec__2(v_parent_662_, v___x_669_, v_outputs_668_);
lean_dec(v_outputs_668_);
return v___x_670_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Graph_unliftedChildCorresponds___boxed(lean_object* v_childCells_674_, lean_object* v_interface_675_, lean_object* v_parent_676_){
_start:
{
uint8_t v_res_677_; lean_object* v_r_678_; 
v_res_677_ = lp_algalVerification_Algal_Core_Graph_unliftedChildCorresponds(v_childCells_674_, v_interface_675_, v_parent_676_);
lean_dec_ref(v_parent_676_);
lean_dec(v_childCells_674_);
v_r_678_ = lean_box(v_res_677_);
return v_r_678_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Ports(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_Graph(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Ports(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
