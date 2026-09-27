// Lean compiler output
// Module: Algal.Source.Model
// Imports: public import Init public meta import Init public import Algal.Core.Binary64 public import Algal.Core.Json
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
lean_object* lean_nat_to_int(lean_object*);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
lean_object* lean_nat_mul(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
uint8_t l_List_isEmpty___redArg(lean_object*);
lean_object* lean_array_mk(lean_object*);
lean_object* lean_array_get_size(lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
size_t lean_usize_of_nat(lean_object*);
uint8_t lean_usize_dec_eq(size_t, size_t);
size_t lean_usize_sub(size_t, size_t);
lean_object* lean_array_uget_borrowed(lean_object*, size_t);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* l_String_quote(lean_object*);
lean_object* l_Repr_addAppParen(lean_object*, lean_object*);
lean_object* l_List_repr_x27___at___00Lean_Syntax_instReprPreresolved_repr_spec__0___redArg(lean_object*);
lean_object* l_Bool_repr___redArg(uint8_t);
lean_object* lean_string_length(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxSourceBytes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxTokens;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxNodes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxExprDepth;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxBindings;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxParameters;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxNameLength;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxCollectionItems;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxFiles;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxImports;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxProjectBytes;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxImportDepth;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxRecords;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxRecordFields;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxSchemaLevels;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxSchemaDepth;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxCells;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxEdges;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxEachItems;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_maxChoiceLabels;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_contractMaxDepth;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqBudgets_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqBudgets_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqBudgets(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqBudgets___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_PType_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqPType(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqPType___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_instReprPType_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 24, .m_capacity = 24, .m_length = 23, .m_data = "Algal.Source.PType.text"};
static const lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprPType_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprPType_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 24, .m_capacity = 24, .m_length = 23, .m_data = "Algal.Source.PType.json"};
static const lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprPType_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprPType_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Source.PType.boolean"};
static const lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprPType_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType_repr___closed__5_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__6;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___closed__7;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprPType_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instReprPType___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instReprPType_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instReprPType___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Source_instReprPType = (const lean_object*)&lp_algalVerification_Algal_Source_instReprPType___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_UnOp_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqUnOp(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqUnOp___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.UnOp.not"};
static const lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.UnOp.neg"};
static const lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__3_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instReprUnOp___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instReprUnOp_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instReprUnOp___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Source_instReprUnOp = (const lean_object*)&lp_algalVerification_Algal_Source_instReprUnOp___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_BinOp_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqBinOp(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqBinOp___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Source.BinOp.add"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Source.BinOp.sub"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Source.BinOp.mul"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Source.BinOp.div"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Source.BinOp.mod"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.BinOp.eq"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__11_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__12_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Source.BinOp.neq"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__12 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__12_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__12_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__13_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.BinOp.lt"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__14_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__15_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__14_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__15 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__15_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.BinOp.le"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__16 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__16_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__16_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__17 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__17_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__18_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.BinOp.gt"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__18 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__18_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__19_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__18_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__19 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__19_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__20_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.BinOp.ge"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__20 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__20_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__21_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__20_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__21 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__21_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__22_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 23, .m_capacity = 23, .m_length = 22, .m_data = "Algal.Source.BinOp.and"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__22 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__22_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__23_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__22_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__23 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__23_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__24_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 22, .m_capacity = 22, .m_length = 21, .m_data = "Algal.Source.BinOp.or"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__24 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__24_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__25_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__24_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__25 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__25_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__26_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Source.BinOp.sconcat"};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__26 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__26_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__27_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__26_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__27 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__27_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instReprBinOp___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instReprBinOp_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instReprBinOp___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Source_instReprBinOp = (const lean_object*)&lp_algalVerification_Algal_Source_instReprBinOp___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_lit_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_lit_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_name_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_name_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_field_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_field_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_probability_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_probability_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_unary_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_unary_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_binary_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_binary_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_record_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_record_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_list_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_list_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_if___00elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_if___00elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_match___00elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_match___00elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_decide_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_decide_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_generate_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_generate_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_call_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_call_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_each_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_each_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_hasEffectEntries(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_hasEffect(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_hasEffectList(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_hasEffectList___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_hasEffectEntries___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_hasEffect___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_callsEntries(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_callsExpr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_callsItems(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthEntries(lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthExpr(lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthItems(lean_object*, uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthItems___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthEntries___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthExpr___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_Array_Basic_0__Array_foldrMUnsafe_fold___at___00List_foldrTR___at___00Algal_Source_analysisProgram_spec__3_spec__4(lean_object*, size_t, size_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_Array_Basic_0__Array_foldrMUnsafe_fold___at___00List_foldrTR___at___00Algal_Source_analysisProgram_spec__3_spec__4___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldrTR___at___00Algal_Source_analysisProgram_spec__3(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldrTR___at___00Algal_Source_analysisProgram_spec__3___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_analysisProgram_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_analysisProgram_spec__2(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldr___at___00List_sum___at___00Algal_Source_analysisProgram_spec__1_spec__1(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldr___at___00List_sum___at___00Algal_Source_analysisProgram_spec__1_spec__1___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_sum___at___00Algal_Source_analysisProgram_spec__1(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_sum___at___00Algal_Source_analysisProgram_spec__1___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisProgram(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisModule___lam__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisModule(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisImports(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisModule___lam__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_CellKind_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqCellKind(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqCellKind___boxed(lean_object*, lean_object*);
static const lean_string_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 28, .m_capacity = 28, .m_length = 27, .m_data = "Algal.Source.CellKind.input"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__1_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Source.CellKind.expr"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 29, .m_capacity = 29, .m_length = 28, .m_data = "Algal.Source.CellKind.decide"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__5_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 28, .m_capacity = 28, .m_length = 27, .m_data = "Algal.Source.CellKind.agent"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__6_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__7_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__6_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__7 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__7_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 31, .m_capacity = 31, .m_length = 30, .m_data = "Algal.Source.CellKind.organism"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 27, .m_capacity = 27, .m_length = 26, .m_data = "Algal.Source.CellKind.each"};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__11_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instReprCellKind___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instReprCellKind_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instReprCellKind___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Source_instReprCellKind = (const lean_object*)&lp_algalVerification_Algal_Source_instReprCellKind___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "{ "};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__0_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = "id"};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__1_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__2_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__3_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__2_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__3 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__3_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__4_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = " := "};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__4 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__4_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__5_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__4_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__5 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__5_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__6_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 5}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__3_value),((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__5_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__6 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__6_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__7;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__8_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 2, .m_capacity = 2, .m_length = 1, .m_data = ","};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__8 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__8_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__9_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__8_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__9 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__9_value;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__10_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 5, .m_capacity = 5, .m_length = 4, .m_data = "kind"};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__10 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__10_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__11_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__10_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__11 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__11_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__12_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__12;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__13_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 7, .m_capacity = 7, .m_length = 6, .m_data = "inputs"};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__13 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__13_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__14_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__13_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__14 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__14_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__15_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__15;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__16_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 8, .m_capacity = 8, .m_length = 7, .m_data = "guarded"};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__16 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__16_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__17_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__16_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__17 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__17_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__18_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__18;
static const lean_string_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__19_value = {.m_header = {.m_rc = 0, .m_cs_sz = 0, .m_other = 0, .m_tag = 249}, .m_size = 3, .m_capacity = 3, .m_length = 2, .m_data = " }"};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__19 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__19_value;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__20_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__20;
static lean_once_cell_t lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__21_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__21;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__22_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__22 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__22_value;
static const lean_ctor_object lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__23_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 3}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__19_value)}};
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__23 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__23_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___boxed(lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Source_instReprOutlineCell___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)lp_algalVerification_Algal_Source_instReprOutlineCell_repr___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell = (const lean_object*)&lp_algalVerification_Algal_Source_instReprOutlineCell___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_programIdentity(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_programIdentity___boxed(lean_object*);
static lean_object* _init_lp_algalVerification_Algal_Source_maxSourceBytes(void){
_start:
{
lean_object* v___x_1_; 
v___x_1_ = lean_unsigned_to_nat(65536u);
return v___x_1_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxTokens(void){
_start:
{
lean_object* v___x_2_; 
v___x_2_ = lean_unsigned_to_nat(8192u);
return v___x_2_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxNodes(void){
_start:
{
lean_object* v___x_3_; 
v___x_3_ = lean_unsigned_to_nat(1024u);
return v___x_3_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxExprDepth(void){
_start:
{
lean_object* v___x_4_; 
v___x_4_ = lean_unsigned_to_nat(16u);
return v___x_4_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxBindings(void){
_start:
{
lean_object* v___x_5_; 
v___x_5_ = lean_unsigned_to_nat(24u);
return v___x_5_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxParameters(void){
_start:
{
lean_object* v___x_6_; 
v___x_6_ = lean_unsigned_to_nat(16u);
return v___x_6_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxNameLength(void){
_start:
{
lean_object* v___x_7_; 
v___x_7_ = lean_unsigned_to_nat(40u);
return v___x_7_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxCollectionItems(void){
_start:
{
lean_object* v___x_8_; 
v___x_8_ = lean_unsigned_to_nat(64u);
return v___x_8_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxFiles(void){
_start:
{
lean_object* v___x_9_; 
v___x_9_ = lean_unsigned_to_nat(16u);
return v___x_9_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxImports(void){
_start:
{
lean_object* v___x_10_; 
v___x_10_ = lean_unsigned_to_nat(16u);
return v___x_10_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxProjectBytes(void){
_start:
{
lean_object* v___x_11_; 
v___x_11_ = lean_unsigned_to_nat(1048576u);
return v___x_11_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxImportDepth(void){
_start:
{
lean_object* v___x_12_; 
v___x_12_ = lean_unsigned_to_nat(8u);
return v___x_12_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxRecords(void){
_start:
{
lean_object* v___x_13_; 
v___x_13_ = lean_unsigned_to_nat(16u);
return v___x_13_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxRecordFields(void){
_start:
{
lean_object* v___x_14_; 
v___x_14_ = lean_unsigned_to_nat(32u);
return v___x_14_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxSchemaLevels(void){
_start:
{
lean_object* v___x_15_; 
v___x_15_ = lean_unsigned_to_nat(8u);
return v___x_15_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxSchemaDepth(void){
_start:
{
lean_object* v___x_16_; 
v___x_16_ = lean_unsigned_to_nat(4u);
return v___x_16_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxCells(void){
_start:
{
lean_object* v___x_17_; 
v___x_17_ = lean_unsigned_to_nat(256u);
return v___x_17_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxEdges(void){
_start:
{
lean_object* v___x_18_; 
v___x_18_ = lean_unsigned_to_nat(512u);
return v___x_18_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxEachItems(void){
_start:
{
lean_object* v___x_19_; 
v___x_19_ = lean_unsigned_to_nat(64u);
return v___x_19_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_maxChoiceLabels(void){
_start:
{
lean_object* v___x_20_; 
v___x_20_ = lean_unsigned_to_nat(32u);
return v___x_20_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_contractMaxDepth(void){
_start:
{
lean_object* v___x_21_; 
v___x_21_ = lean_unsigned_to_nat(8u);
return v___x_21_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqBudgets_decEq(lean_object* v_x_22_, lean_object* v_x_23_){
_start:
{
lean_object* v_maxSteps_24_; lean_object* v_maxAgentCalls_25_; lean_object* v_maxWork_26_; lean_object* v_maxContextBytes_27_; lean_object* v_maxOutputBytes_28_; lean_object* v_maxDepth_29_; lean_object* v_maxSteps_30_; lean_object* v_maxAgentCalls_31_; lean_object* v_maxWork_32_; lean_object* v_maxContextBytes_33_; lean_object* v_maxOutputBytes_34_; lean_object* v_maxDepth_35_; uint8_t v___x_36_; 
v_maxSteps_24_ = lean_ctor_get(v_x_22_, 0);
v_maxAgentCalls_25_ = lean_ctor_get(v_x_22_, 1);
v_maxWork_26_ = lean_ctor_get(v_x_22_, 2);
v_maxContextBytes_27_ = lean_ctor_get(v_x_22_, 3);
v_maxOutputBytes_28_ = lean_ctor_get(v_x_22_, 4);
v_maxDepth_29_ = lean_ctor_get(v_x_22_, 5);
v_maxSteps_30_ = lean_ctor_get(v_x_23_, 0);
v_maxAgentCalls_31_ = lean_ctor_get(v_x_23_, 1);
v_maxWork_32_ = lean_ctor_get(v_x_23_, 2);
v_maxContextBytes_33_ = lean_ctor_get(v_x_23_, 3);
v_maxOutputBytes_34_ = lean_ctor_get(v_x_23_, 4);
v_maxDepth_35_ = lean_ctor_get(v_x_23_, 5);
v___x_36_ = lean_nat_dec_eq(v_maxSteps_24_, v_maxSteps_30_);
if (v___x_36_ == 0)
{
return v___x_36_;
}
else
{
uint8_t v___x_37_; 
v___x_37_ = lean_nat_dec_eq(v_maxAgentCalls_25_, v_maxAgentCalls_31_);
if (v___x_37_ == 0)
{
return v___x_37_;
}
else
{
uint8_t v___x_38_; 
v___x_38_ = lean_nat_dec_eq(v_maxWork_26_, v_maxWork_32_);
if (v___x_38_ == 0)
{
return v___x_38_;
}
else
{
uint8_t v___x_39_; 
v___x_39_ = lean_nat_dec_eq(v_maxContextBytes_27_, v_maxContextBytes_33_);
if (v___x_39_ == 0)
{
return v___x_39_;
}
else
{
uint8_t v___x_40_; 
v___x_40_ = lean_nat_dec_eq(v_maxOutputBytes_28_, v_maxOutputBytes_34_);
if (v___x_40_ == 0)
{
return v___x_40_;
}
else
{
uint8_t v___x_41_; 
v___x_41_ = lean_nat_dec_eq(v_maxDepth_29_, v_maxDepth_35_);
return v___x_41_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqBudgets_decEq___boxed(lean_object* v_x_42_, lean_object* v_x_43_){
_start:
{
uint8_t v_res_44_; lean_object* v_r_45_; 
v_res_44_ = lp_algalVerification_Algal_Source_instDecidableEqBudgets_decEq(v_x_42_, v_x_43_);
lean_dec_ref(v_x_43_);
lean_dec_ref(v_x_42_);
v_r_45_ = lean_box(v_res_44_);
return v_r_45_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqBudgets(lean_object* v_x_46_, lean_object* v_x_47_){
_start:
{
uint8_t v___x_48_; 
v___x_48_ = lp_algalVerification_Algal_Source_instDecidableEqBudgets_decEq(v_x_46_, v_x_47_);
return v___x_48_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqBudgets___boxed(lean_object* v_x_49_, lean_object* v_x_50_){
_start:
{
uint8_t v_res_51_; lean_object* v_r_52_; 
v_res_51_ = lp_algalVerification_Algal_Source_instDecidableEqBudgets(v_x_49_, v_x_50_);
lean_dec_ref(v_x_50_);
lean_dec_ref(v_x_49_);
v_r_52_ = lean_box(v_res_51_);
return v_r_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorIdx(uint8_t v_x_53_){
_start:
{
switch(v_x_53_)
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
default: 
{
lean_object* v___x_56_; 
v___x_56_ = lean_unsigned_to_nat(2u);
return v___x_56_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorIdx___boxed(lean_object* v_x_57_){
_start:
{
uint8_t v_x_boxed_58_; lean_object* v_res_59_; 
v_x_boxed_58_ = lean_unbox(v_x_57_);
v_res_59_ = lp_algalVerification_Algal_Source_PType_ctorIdx(v_x_boxed_58_);
return v_res_59_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim___redArg(lean_object* v_k_60_){
_start:
{
lean_inc(v_k_60_);
return v_k_60_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim___redArg___boxed(lean_object* v_k_61_){
_start:
{
lean_object* v_res_62_; 
v_res_62_ = lp_algalVerification_Algal_Source_PType_ctorElim___redArg(v_k_61_);
lean_dec(v_k_61_);
return v_res_62_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim(lean_object* v_motive_63_, lean_object* v_ctorIdx_64_, uint8_t v_t_65_, lean_object* v_h_66_, lean_object* v_k_67_){
_start:
{
lean_inc(v_k_67_);
return v_k_67_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ctorElim___boxed(lean_object* v_motive_68_, lean_object* v_ctorIdx_69_, lean_object* v_t_70_, lean_object* v_h_71_, lean_object* v_k_72_){
_start:
{
uint8_t v_t_boxed_73_; lean_object* v_res_74_; 
v_t_boxed_73_ = lean_unbox(v_t_70_);
v_res_74_ = lp_algalVerification_Algal_Source_PType_ctorElim(v_motive_68_, v_ctorIdx_69_, v_t_boxed_73_, v_h_71_, v_k_72_);
lean_dec(v_k_72_);
lean_dec(v_ctorIdx_69_);
return v_res_74_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim___redArg(lean_object* v_text_75_){
_start:
{
lean_inc(v_text_75_);
return v_text_75_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim___redArg___boxed(lean_object* v_text_76_){
_start:
{
lean_object* v_res_77_; 
v_res_77_ = lp_algalVerification_Algal_Source_PType_text_elim___redArg(v_text_76_);
lean_dec(v_text_76_);
return v_res_77_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim(lean_object* v_motive_78_, uint8_t v_t_79_, lean_object* v_h_80_, lean_object* v_text_81_){
_start:
{
lean_inc(v_text_81_);
return v_text_81_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_text_elim___boxed(lean_object* v_motive_82_, lean_object* v_t_83_, lean_object* v_h_84_, lean_object* v_text_85_){
_start:
{
uint8_t v_t_boxed_86_; lean_object* v_res_87_; 
v_t_boxed_86_ = lean_unbox(v_t_83_);
v_res_87_ = lp_algalVerification_Algal_Source_PType_text_elim(v_motive_82_, v_t_boxed_86_, v_h_84_, v_text_85_);
lean_dec(v_text_85_);
return v_res_87_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim___redArg(lean_object* v_json_88_){
_start:
{
lean_inc(v_json_88_);
return v_json_88_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim___redArg___boxed(lean_object* v_json_89_){
_start:
{
lean_object* v_res_90_; 
v_res_90_ = lp_algalVerification_Algal_Source_PType_json_elim___redArg(v_json_89_);
lean_dec(v_json_89_);
return v_res_90_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim(lean_object* v_motive_91_, uint8_t v_t_92_, lean_object* v_h_93_, lean_object* v_json_94_){
_start:
{
lean_inc(v_json_94_);
return v_json_94_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_json_elim___boxed(lean_object* v_motive_95_, lean_object* v_t_96_, lean_object* v_h_97_, lean_object* v_json_98_){
_start:
{
uint8_t v_t_boxed_99_; lean_object* v_res_100_; 
v_t_boxed_99_ = lean_unbox(v_t_96_);
v_res_100_ = lp_algalVerification_Algal_Source_PType_json_elim(v_motive_95_, v_t_boxed_99_, v_h_97_, v_json_98_);
lean_dec(v_json_98_);
return v_res_100_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim___redArg(lean_object* v_boolean_101_){
_start:
{
lean_inc(v_boolean_101_);
return v_boolean_101_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim___redArg___boxed(lean_object* v_boolean_102_){
_start:
{
lean_object* v_res_103_; 
v_res_103_ = lp_algalVerification_Algal_Source_PType_boolean_elim___redArg(v_boolean_102_);
lean_dec(v_boolean_102_);
return v_res_103_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim(lean_object* v_motive_104_, uint8_t v_t_105_, lean_object* v_h_106_, lean_object* v_boolean_107_){
_start:
{
lean_inc(v_boolean_107_);
return v_boolean_107_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_boolean_elim___boxed(lean_object* v_motive_108_, lean_object* v_t_109_, lean_object* v_h_110_, lean_object* v_boolean_111_){
_start:
{
uint8_t v_t_boxed_112_; lean_object* v_res_113_; 
v_t_boxed_112_ = lean_unbox(v_t_109_);
v_res_113_ = lp_algalVerification_Algal_Source_PType_boolean_elim(v_motive_108_, v_t_boxed_112_, v_h_110_, v_boolean_111_);
lean_dec(v_boolean_111_);
return v_res_113_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_PType_ofNat(lean_object* v_n_114_){
_start:
{
lean_object* v___x_115_; uint8_t v___x_116_; 
v___x_115_ = lean_unsigned_to_nat(0u);
v___x_116_ = lean_nat_dec_le(v_n_114_, v___x_115_);
if (v___x_116_ == 0)
{
lean_object* v___x_117_; uint8_t v___x_118_; 
v___x_117_ = lean_unsigned_to_nat(1u);
v___x_118_ = lean_nat_dec_le(v_n_114_, v___x_117_);
if (v___x_118_ == 0)
{
uint8_t v___x_119_; 
v___x_119_ = 2;
return v___x_119_;
}
else
{
uint8_t v___x_120_; 
v___x_120_ = 1;
return v___x_120_;
}
}
else
{
uint8_t v___x_121_; 
v___x_121_ = 0;
return v___x_121_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_PType_ofNat___boxed(lean_object* v_n_122_){
_start:
{
uint8_t v_res_123_; lean_object* v_r_124_; 
v_res_123_ = lp_algalVerification_Algal_Source_PType_ofNat(v_n_122_);
lean_dec(v_n_122_);
v_r_124_ = lean_box(v_res_123_);
return v_r_124_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqPType(uint8_t v_x_125_, uint8_t v_y_126_){
_start:
{
lean_object* v___x_127_; lean_object* v___x_128_; uint8_t v___x_129_; 
v___x_127_ = lp_algalVerification_Algal_Source_PType_ctorIdx(v_x_125_);
v___x_128_ = lp_algalVerification_Algal_Source_PType_ctorIdx(v_y_126_);
v___x_129_ = lean_nat_dec_eq(v___x_127_, v___x_128_);
lean_dec(v___x_128_);
lean_dec(v___x_127_);
return v___x_129_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqPType___boxed(lean_object* v_x_130_, lean_object* v_y_131_){
_start:
{
uint8_t v_x_13__boxed_132_; uint8_t v_y_14__boxed_133_; uint8_t v_res_134_; lean_object* v_r_135_; 
v_x_13__boxed_132_ = lean_unbox(v_x_130_);
v_y_14__boxed_133_ = lean_unbox(v_y_131_);
v_res_134_ = lp_algalVerification_Algal_Source_instDecidableEqPType(v_x_13__boxed_132_, v_y_14__boxed_133_);
v_r_135_ = lean_box(v_res_134_);
return v_r_135_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6(void){
_start:
{
lean_object* v___x_145_; lean_object* v___x_146_; 
v___x_145_ = lean_unsigned_to_nat(2u);
v___x_146_ = lean_nat_to_int(v___x_145_);
return v___x_146_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7(void){
_start:
{
lean_object* v___x_147_; lean_object* v___x_148_; 
v___x_147_ = lean_unsigned_to_nat(1u);
v___x_148_ = lean_nat_to_int(v___x_147_);
return v___x_148_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprPType_repr(uint8_t v_x_149_, lean_object* v_prec_150_){
_start:
{
lean_object* v___y_152_; lean_object* v___y_159_; lean_object* v___y_166_; 
switch(v_x_149_)
{
case 0:
{
lean_object* v___x_172_; uint8_t v___x_173_; 
v___x_172_ = lean_unsigned_to_nat(1024u);
v___x_173_ = lean_nat_dec_le(v___x_172_, v_prec_150_);
if (v___x_173_ == 0)
{
lean_object* v___x_174_; 
v___x_174_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_152_ = v___x_174_;
goto v___jp_151_;
}
else
{
lean_object* v___x_175_; 
v___x_175_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_152_ = v___x_175_;
goto v___jp_151_;
}
}
case 1:
{
lean_object* v___x_176_; uint8_t v___x_177_; 
v___x_176_ = lean_unsigned_to_nat(1024u);
v___x_177_ = lean_nat_dec_le(v___x_176_, v_prec_150_);
if (v___x_177_ == 0)
{
lean_object* v___x_178_; 
v___x_178_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_159_ = v___x_178_;
goto v___jp_158_;
}
else
{
lean_object* v___x_179_; 
v___x_179_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_159_ = v___x_179_;
goto v___jp_158_;
}
}
default: 
{
lean_object* v___x_180_; uint8_t v___x_181_; 
v___x_180_ = lean_unsigned_to_nat(1024u);
v___x_181_ = lean_nat_dec_le(v___x_180_, v_prec_150_);
if (v___x_181_ == 0)
{
lean_object* v___x_182_; 
v___x_182_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_166_ = v___x_182_;
goto v___jp_165_;
}
else
{
lean_object* v___x_183_; 
v___x_183_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_166_ = v___x_183_;
goto v___jp_165_;
}
}
}
v___jp_151_:
{
lean_object* v___x_153_; lean_object* v___x_154_; uint8_t v___x_155_; lean_object* v___x_156_; lean_object* v___x_157_; 
v___x_153_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprPType_repr___closed__1));
lean_inc(v___y_152_);
v___x_154_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_154_, 0, v___y_152_);
lean_ctor_set(v___x_154_, 1, v___x_153_);
v___x_155_ = 0;
v___x_156_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_156_, 0, v___x_154_);
lean_ctor_set_uint8(v___x_156_, sizeof(void*)*1, v___x_155_);
v___x_157_ = l_Repr_addAppParen(v___x_156_, v_prec_150_);
return v___x_157_;
}
v___jp_158_:
{
lean_object* v___x_160_; lean_object* v___x_161_; uint8_t v___x_162_; lean_object* v___x_163_; lean_object* v___x_164_; 
v___x_160_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprPType_repr___closed__3));
lean_inc(v___y_159_);
v___x_161_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_161_, 0, v___y_159_);
lean_ctor_set(v___x_161_, 1, v___x_160_);
v___x_162_ = 0;
v___x_163_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_163_, 0, v___x_161_);
lean_ctor_set_uint8(v___x_163_, sizeof(void*)*1, v___x_162_);
v___x_164_ = l_Repr_addAppParen(v___x_163_, v_prec_150_);
return v___x_164_;
}
v___jp_165_:
{
lean_object* v___x_167_; lean_object* v___x_168_; uint8_t v___x_169_; lean_object* v___x_170_; lean_object* v___x_171_; 
v___x_167_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprPType_repr___closed__5));
lean_inc(v___y_166_);
v___x_168_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_168_, 0, v___y_166_);
lean_ctor_set(v___x_168_, 1, v___x_167_);
v___x_169_ = 0;
v___x_170_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_170_, 0, v___x_168_);
lean_ctor_set_uint8(v___x_170_, sizeof(void*)*1, v___x_169_);
v___x_171_ = l_Repr_addAppParen(v___x_170_, v_prec_150_);
return v___x_171_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprPType_repr___boxed(lean_object* v_x_184_, lean_object* v_prec_185_){
_start:
{
uint8_t v_x_177__boxed_186_; lean_object* v_res_187_; 
v_x_177__boxed_186_ = lean_unbox(v_x_184_);
v_res_187_ = lp_algalVerification_Algal_Source_instReprPType_repr(v_x_177__boxed_186_, v_prec_185_);
lean_dec(v_prec_185_);
return v_res_187_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorIdx(uint8_t v_x_190_){
_start:
{
if (v_x_190_ == 0)
{
lean_object* v___x_191_; 
v___x_191_ = lean_unsigned_to_nat(0u);
return v___x_191_;
}
else
{
lean_object* v___x_192_; 
v___x_192_ = lean_unsigned_to_nat(1u);
return v___x_192_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorIdx___boxed(lean_object* v_x_193_){
_start:
{
uint8_t v_x_boxed_194_; lean_object* v_res_195_; 
v_x_boxed_194_ = lean_unbox(v_x_193_);
v_res_195_ = lp_algalVerification_Algal_Source_UnOp_ctorIdx(v_x_boxed_194_);
return v_res_195_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim___redArg(lean_object* v_k_196_){
_start:
{
lean_inc(v_k_196_);
return v_k_196_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim___redArg___boxed(lean_object* v_k_197_){
_start:
{
lean_object* v_res_198_; 
v_res_198_ = lp_algalVerification_Algal_Source_UnOp_ctorElim___redArg(v_k_197_);
lean_dec(v_k_197_);
return v_res_198_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim(lean_object* v_motive_199_, lean_object* v_ctorIdx_200_, uint8_t v_t_201_, lean_object* v_h_202_, lean_object* v_k_203_){
_start:
{
lean_inc(v_k_203_);
return v_k_203_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ctorElim___boxed(lean_object* v_motive_204_, lean_object* v_ctorIdx_205_, lean_object* v_t_206_, lean_object* v_h_207_, lean_object* v_k_208_){
_start:
{
uint8_t v_t_boxed_209_; lean_object* v_res_210_; 
v_t_boxed_209_ = lean_unbox(v_t_206_);
v_res_210_ = lp_algalVerification_Algal_Source_UnOp_ctorElim(v_motive_204_, v_ctorIdx_205_, v_t_boxed_209_, v_h_207_, v_k_208_);
lean_dec(v_k_208_);
lean_dec(v_ctorIdx_205_);
return v_res_210_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim___redArg(lean_object* v_not_211_){
_start:
{
lean_inc(v_not_211_);
return v_not_211_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim___redArg___boxed(lean_object* v_not_212_){
_start:
{
lean_object* v_res_213_; 
v_res_213_ = lp_algalVerification_Algal_Source_UnOp_not_elim___redArg(v_not_212_);
lean_dec(v_not_212_);
return v_res_213_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim(lean_object* v_motive_214_, uint8_t v_t_215_, lean_object* v_h_216_, lean_object* v_not_217_){
_start:
{
lean_inc(v_not_217_);
return v_not_217_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_not_elim___boxed(lean_object* v_motive_218_, lean_object* v_t_219_, lean_object* v_h_220_, lean_object* v_not_221_){
_start:
{
uint8_t v_t_boxed_222_; lean_object* v_res_223_; 
v_t_boxed_222_ = lean_unbox(v_t_219_);
v_res_223_ = lp_algalVerification_Algal_Source_UnOp_not_elim(v_motive_218_, v_t_boxed_222_, v_h_220_, v_not_221_);
lean_dec(v_not_221_);
return v_res_223_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim___redArg(lean_object* v_neg_224_){
_start:
{
lean_inc(v_neg_224_);
return v_neg_224_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim___redArg___boxed(lean_object* v_neg_225_){
_start:
{
lean_object* v_res_226_; 
v_res_226_ = lp_algalVerification_Algal_Source_UnOp_neg_elim___redArg(v_neg_225_);
lean_dec(v_neg_225_);
return v_res_226_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim(lean_object* v_motive_227_, uint8_t v_t_228_, lean_object* v_h_229_, lean_object* v_neg_230_){
_start:
{
lean_inc(v_neg_230_);
return v_neg_230_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_neg_elim___boxed(lean_object* v_motive_231_, lean_object* v_t_232_, lean_object* v_h_233_, lean_object* v_neg_234_){
_start:
{
uint8_t v_t_boxed_235_; lean_object* v_res_236_; 
v_t_boxed_235_ = lean_unbox(v_t_232_);
v_res_236_ = lp_algalVerification_Algal_Source_UnOp_neg_elim(v_motive_231_, v_t_boxed_235_, v_h_233_, v_neg_234_);
lean_dec(v_neg_234_);
return v_res_236_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_UnOp_ofNat(lean_object* v_n_237_){
_start:
{
lean_object* v___x_238_; uint8_t v___x_239_; 
v___x_238_ = lean_unsigned_to_nat(0u);
v___x_239_ = lean_nat_dec_le(v_n_237_, v___x_238_);
if (v___x_239_ == 0)
{
uint8_t v___x_240_; 
v___x_240_ = 1;
return v___x_240_;
}
else
{
uint8_t v___x_241_; 
v___x_241_ = 0;
return v___x_241_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_UnOp_ofNat___boxed(lean_object* v_n_242_){
_start:
{
uint8_t v_res_243_; lean_object* v_r_244_; 
v_res_243_ = lp_algalVerification_Algal_Source_UnOp_ofNat(v_n_242_);
lean_dec(v_n_242_);
v_r_244_ = lean_box(v_res_243_);
return v_r_244_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqUnOp(uint8_t v_x_245_, uint8_t v_y_246_){
_start:
{
lean_object* v___x_247_; lean_object* v___x_248_; uint8_t v___x_249_; 
v___x_247_ = lp_algalVerification_Algal_Source_UnOp_ctorIdx(v_x_245_);
v___x_248_ = lp_algalVerification_Algal_Source_UnOp_ctorIdx(v_y_246_);
v___x_249_ = lean_nat_dec_eq(v___x_247_, v___x_248_);
lean_dec(v___x_248_);
lean_dec(v___x_247_);
return v___x_249_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqUnOp___boxed(lean_object* v_x_250_, lean_object* v_y_251_){
_start:
{
uint8_t v_x_13__boxed_252_; uint8_t v_y_14__boxed_253_; uint8_t v_res_254_; lean_object* v_r_255_; 
v_x_13__boxed_252_ = lean_unbox(v_x_250_);
v_y_14__boxed_253_ = lean_unbox(v_y_251_);
v_res_254_ = lp_algalVerification_Algal_Source_instDecidableEqUnOp(v_x_13__boxed_252_, v_y_14__boxed_253_);
v_r_255_ = lean_box(v_res_254_);
return v_r_255_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr(uint8_t v_x_262_, lean_object* v_prec_263_){
_start:
{
lean_object* v___y_265_; lean_object* v___y_272_; 
if (v_x_262_ == 0)
{
lean_object* v___x_278_; uint8_t v___x_279_; 
v___x_278_ = lean_unsigned_to_nat(1024u);
v___x_279_ = lean_nat_dec_le(v___x_278_, v_prec_263_);
if (v___x_279_ == 0)
{
lean_object* v___x_280_; 
v___x_280_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_265_ = v___x_280_;
goto v___jp_264_;
}
else
{
lean_object* v___x_281_; 
v___x_281_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_265_ = v___x_281_;
goto v___jp_264_;
}
}
else
{
lean_object* v___x_282_; uint8_t v___x_283_; 
v___x_282_ = lean_unsigned_to_nat(1024u);
v___x_283_ = lean_nat_dec_le(v___x_282_, v_prec_263_);
if (v___x_283_ == 0)
{
lean_object* v___x_284_; 
v___x_284_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_272_ = v___x_284_;
goto v___jp_271_;
}
else
{
lean_object* v___x_285_; 
v___x_285_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_272_ = v___x_285_;
goto v___jp_271_;
}
}
v___jp_264_:
{
lean_object* v___x_266_; lean_object* v___x_267_; uint8_t v___x_268_; lean_object* v___x_269_; lean_object* v___x_270_; 
v___x_266_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__1));
lean_inc(v___y_265_);
v___x_267_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_267_, 0, v___y_265_);
lean_ctor_set(v___x_267_, 1, v___x_266_);
v___x_268_ = 0;
v___x_269_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_269_, 0, v___x_267_);
lean_ctor_set_uint8(v___x_269_, sizeof(void*)*1, v___x_268_);
v___x_270_ = l_Repr_addAppParen(v___x_269_, v_prec_263_);
return v___x_270_;
}
v___jp_271_:
{
lean_object* v___x_273_; lean_object* v___x_274_; uint8_t v___x_275_; lean_object* v___x_276_; lean_object* v___x_277_; 
v___x_273_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprUnOp_repr___closed__3));
lean_inc(v___y_272_);
v___x_274_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_274_, 0, v___y_272_);
lean_ctor_set(v___x_274_, 1, v___x_273_);
v___x_275_ = 0;
v___x_276_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_276_, 0, v___x_274_);
lean_ctor_set_uint8(v___x_276_, sizeof(void*)*1, v___x_275_);
v___x_277_ = l_Repr_addAppParen(v___x_276_, v_prec_263_);
return v___x_277_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprUnOp_repr___boxed(lean_object* v_x_286_, lean_object* v_prec_287_){
_start:
{
uint8_t v_x_117__boxed_288_; lean_object* v_res_289_; 
v_x_117__boxed_288_ = lean_unbox(v_x_286_);
v_res_289_ = lp_algalVerification_Algal_Source_instReprUnOp_repr(v_x_117__boxed_288_, v_prec_287_);
lean_dec(v_prec_287_);
return v_res_289_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorIdx(uint8_t v_x_292_){
_start:
{
switch(v_x_292_)
{
case 0:
{
lean_object* v___x_293_; 
v___x_293_ = lean_unsigned_to_nat(0u);
return v___x_293_;
}
case 1:
{
lean_object* v___x_294_; 
v___x_294_ = lean_unsigned_to_nat(1u);
return v___x_294_;
}
case 2:
{
lean_object* v___x_295_; 
v___x_295_ = lean_unsigned_to_nat(2u);
return v___x_295_;
}
case 3:
{
lean_object* v___x_296_; 
v___x_296_ = lean_unsigned_to_nat(3u);
return v___x_296_;
}
case 4:
{
lean_object* v___x_297_; 
v___x_297_ = lean_unsigned_to_nat(4u);
return v___x_297_;
}
case 5:
{
lean_object* v___x_298_; 
v___x_298_ = lean_unsigned_to_nat(5u);
return v___x_298_;
}
case 6:
{
lean_object* v___x_299_; 
v___x_299_ = lean_unsigned_to_nat(6u);
return v___x_299_;
}
case 7:
{
lean_object* v___x_300_; 
v___x_300_ = lean_unsigned_to_nat(7u);
return v___x_300_;
}
case 8:
{
lean_object* v___x_301_; 
v___x_301_ = lean_unsigned_to_nat(8u);
return v___x_301_;
}
case 9:
{
lean_object* v___x_302_; 
v___x_302_ = lean_unsigned_to_nat(9u);
return v___x_302_;
}
case 10:
{
lean_object* v___x_303_; 
v___x_303_ = lean_unsigned_to_nat(10u);
return v___x_303_;
}
case 11:
{
lean_object* v___x_304_; 
v___x_304_ = lean_unsigned_to_nat(11u);
return v___x_304_;
}
case 12:
{
lean_object* v___x_305_; 
v___x_305_ = lean_unsigned_to_nat(12u);
return v___x_305_;
}
default: 
{
lean_object* v___x_306_; 
v___x_306_ = lean_unsigned_to_nat(13u);
return v___x_306_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorIdx___boxed(lean_object* v_x_307_){
_start:
{
uint8_t v_x_boxed_308_; lean_object* v_res_309_; 
v_x_boxed_308_ = lean_unbox(v_x_307_);
v_res_309_ = lp_algalVerification_Algal_Source_BinOp_ctorIdx(v_x_boxed_308_);
return v_res_309_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim___redArg(lean_object* v_k_310_){
_start:
{
lean_inc(v_k_310_);
return v_k_310_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim___redArg___boxed(lean_object* v_k_311_){
_start:
{
lean_object* v_res_312_; 
v_res_312_ = lp_algalVerification_Algal_Source_BinOp_ctorElim___redArg(v_k_311_);
lean_dec(v_k_311_);
return v_res_312_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim(lean_object* v_motive_313_, lean_object* v_ctorIdx_314_, uint8_t v_t_315_, lean_object* v_h_316_, lean_object* v_k_317_){
_start:
{
lean_inc(v_k_317_);
return v_k_317_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ctorElim___boxed(lean_object* v_motive_318_, lean_object* v_ctorIdx_319_, lean_object* v_t_320_, lean_object* v_h_321_, lean_object* v_k_322_){
_start:
{
uint8_t v_t_boxed_323_; lean_object* v_res_324_; 
v_t_boxed_323_ = lean_unbox(v_t_320_);
v_res_324_ = lp_algalVerification_Algal_Source_BinOp_ctorElim(v_motive_318_, v_ctorIdx_319_, v_t_boxed_323_, v_h_321_, v_k_322_);
lean_dec(v_k_322_);
lean_dec(v_ctorIdx_319_);
return v_res_324_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim___redArg(lean_object* v_add_325_){
_start:
{
lean_inc(v_add_325_);
return v_add_325_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim___redArg___boxed(lean_object* v_add_326_){
_start:
{
lean_object* v_res_327_; 
v_res_327_ = lp_algalVerification_Algal_Source_BinOp_add_elim___redArg(v_add_326_);
lean_dec(v_add_326_);
return v_res_327_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim(lean_object* v_motive_328_, uint8_t v_t_329_, lean_object* v_h_330_, lean_object* v_add_331_){
_start:
{
lean_inc(v_add_331_);
return v_add_331_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_add_elim___boxed(lean_object* v_motive_332_, lean_object* v_t_333_, lean_object* v_h_334_, lean_object* v_add_335_){
_start:
{
uint8_t v_t_boxed_336_; lean_object* v_res_337_; 
v_t_boxed_336_ = lean_unbox(v_t_333_);
v_res_337_ = lp_algalVerification_Algal_Source_BinOp_add_elim(v_motive_332_, v_t_boxed_336_, v_h_334_, v_add_335_);
lean_dec(v_add_335_);
return v_res_337_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim___redArg(lean_object* v_sub_338_){
_start:
{
lean_inc(v_sub_338_);
return v_sub_338_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim___redArg___boxed(lean_object* v_sub_339_){
_start:
{
lean_object* v_res_340_; 
v_res_340_ = lp_algalVerification_Algal_Source_BinOp_sub_elim___redArg(v_sub_339_);
lean_dec(v_sub_339_);
return v_res_340_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim(lean_object* v_motive_341_, uint8_t v_t_342_, lean_object* v_h_343_, lean_object* v_sub_344_){
_start:
{
lean_inc(v_sub_344_);
return v_sub_344_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sub_elim___boxed(lean_object* v_motive_345_, lean_object* v_t_346_, lean_object* v_h_347_, lean_object* v_sub_348_){
_start:
{
uint8_t v_t_boxed_349_; lean_object* v_res_350_; 
v_t_boxed_349_ = lean_unbox(v_t_346_);
v_res_350_ = lp_algalVerification_Algal_Source_BinOp_sub_elim(v_motive_345_, v_t_boxed_349_, v_h_347_, v_sub_348_);
lean_dec(v_sub_348_);
return v_res_350_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim___redArg(lean_object* v_mul_351_){
_start:
{
lean_inc(v_mul_351_);
return v_mul_351_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim___redArg___boxed(lean_object* v_mul_352_){
_start:
{
lean_object* v_res_353_; 
v_res_353_ = lp_algalVerification_Algal_Source_BinOp_mul_elim___redArg(v_mul_352_);
lean_dec(v_mul_352_);
return v_res_353_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim(lean_object* v_motive_354_, uint8_t v_t_355_, lean_object* v_h_356_, lean_object* v_mul_357_){
_start:
{
lean_inc(v_mul_357_);
return v_mul_357_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mul_elim___boxed(lean_object* v_motive_358_, lean_object* v_t_359_, lean_object* v_h_360_, lean_object* v_mul_361_){
_start:
{
uint8_t v_t_boxed_362_; lean_object* v_res_363_; 
v_t_boxed_362_ = lean_unbox(v_t_359_);
v_res_363_ = lp_algalVerification_Algal_Source_BinOp_mul_elim(v_motive_358_, v_t_boxed_362_, v_h_360_, v_mul_361_);
lean_dec(v_mul_361_);
return v_res_363_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim___redArg(lean_object* v_div_364_){
_start:
{
lean_inc(v_div_364_);
return v_div_364_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim___redArg___boxed(lean_object* v_div_365_){
_start:
{
lean_object* v_res_366_; 
v_res_366_ = lp_algalVerification_Algal_Source_BinOp_div_elim___redArg(v_div_365_);
lean_dec(v_div_365_);
return v_res_366_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim(lean_object* v_motive_367_, uint8_t v_t_368_, lean_object* v_h_369_, lean_object* v_div_370_){
_start:
{
lean_inc(v_div_370_);
return v_div_370_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_div_elim___boxed(lean_object* v_motive_371_, lean_object* v_t_372_, lean_object* v_h_373_, lean_object* v_div_374_){
_start:
{
uint8_t v_t_boxed_375_; lean_object* v_res_376_; 
v_t_boxed_375_ = lean_unbox(v_t_372_);
v_res_376_ = lp_algalVerification_Algal_Source_BinOp_div_elim(v_motive_371_, v_t_boxed_375_, v_h_373_, v_div_374_);
lean_dec(v_div_374_);
return v_res_376_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim___redArg(lean_object* v_mod_377_){
_start:
{
lean_inc(v_mod_377_);
return v_mod_377_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim___redArg___boxed(lean_object* v_mod_378_){
_start:
{
lean_object* v_res_379_; 
v_res_379_ = lp_algalVerification_Algal_Source_BinOp_mod_elim___redArg(v_mod_378_);
lean_dec(v_mod_378_);
return v_res_379_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim(lean_object* v_motive_380_, uint8_t v_t_381_, lean_object* v_h_382_, lean_object* v_mod_383_){
_start:
{
lean_inc(v_mod_383_);
return v_mod_383_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_mod_elim___boxed(lean_object* v_motive_384_, lean_object* v_t_385_, lean_object* v_h_386_, lean_object* v_mod_387_){
_start:
{
uint8_t v_t_boxed_388_; lean_object* v_res_389_; 
v_t_boxed_388_ = lean_unbox(v_t_385_);
v_res_389_ = lp_algalVerification_Algal_Source_BinOp_mod_elim(v_motive_384_, v_t_boxed_388_, v_h_386_, v_mod_387_);
lean_dec(v_mod_387_);
return v_res_389_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim___redArg(lean_object* v_eq_390_){
_start:
{
lean_inc(v_eq_390_);
return v_eq_390_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim___redArg___boxed(lean_object* v_eq_391_){
_start:
{
lean_object* v_res_392_; 
v_res_392_ = lp_algalVerification_Algal_Source_BinOp_eq_elim___redArg(v_eq_391_);
lean_dec(v_eq_391_);
return v_res_392_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim(lean_object* v_motive_393_, uint8_t v_t_394_, lean_object* v_h_395_, lean_object* v_eq_396_){
_start:
{
lean_inc(v_eq_396_);
return v_eq_396_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_eq_elim___boxed(lean_object* v_motive_397_, lean_object* v_t_398_, lean_object* v_h_399_, lean_object* v_eq_400_){
_start:
{
uint8_t v_t_boxed_401_; lean_object* v_res_402_; 
v_t_boxed_401_ = lean_unbox(v_t_398_);
v_res_402_ = lp_algalVerification_Algal_Source_BinOp_eq_elim(v_motive_397_, v_t_boxed_401_, v_h_399_, v_eq_400_);
lean_dec(v_eq_400_);
return v_res_402_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim___redArg(lean_object* v_neq_403_){
_start:
{
lean_inc(v_neq_403_);
return v_neq_403_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim___redArg___boxed(lean_object* v_neq_404_){
_start:
{
lean_object* v_res_405_; 
v_res_405_ = lp_algalVerification_Algal_Source_BinOp_neq_elim___redArg(v_neq_404_);
lean_dec(v_neq_404_);
return v_res_405_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim(lean_object* v_motive_406_, uint8_t v_t_407_, lean_object* v_h_408_, lean_object* v_neq_409_){
_start:
{
lean_inc(v_neq_409_);
return v_neq_409_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_neq_elim___boxed(lean_object* v_motive_410_, lean_object* v_t_411_, lean_object* v_h_412_, lean_object* v_neq_413_){
_start:
{
uint8_t v_t_boxed_414_; lean_object* v_res_415_; 
v_t_boxed_414_ = lean_unbox(v_t_411_);
v_res_415_ = lp_algalVerification_Algal_Source_BinOp_neq_elim(v_motive_410_, v_t_boxed_414_, v_h_412_, v_neq_413_);
lean_dec(v_neq_413_);
return v_res_415_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim___redArg(lean_object* v_lt_416_){
_start:
{
lean_inc(v_lt_416_);
return v_lt_416_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim___redArg___boxed(lean_object* v_lt_417_){
_start:
{
lean_object* v_res_418_; 
v_res_418_ = lp_algalVerification_Algal_Source_BinOp_lt_elim___redArg(v_lt_417_);
lean_dec(v_lt_417_);
return v_res_418_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim(lean_object* v_motive_419_, uint8_t v_t_420_, lean_object* v_h_421_, lean_object* v_lt_422_){
_start:
{
lean_inc(v_lt_422_);
return v_lt_422_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_lt_elim___boxed(lean_object* v_motive_423_, lean_object* v_t_424_, lean_object* v_h_425_, lean_object* v_lt_426_){
_start:
{
uint8_t v_t_boxed_427_; lean_object* v_res_428_; 
v_t_boxed_427_ = lean_unbox(v_t_424_);
v_res_428_ = lp_algalVerification_Algal_Source_BinOp_lt_elim(v_motive_423_, v_t_boxed_427_, v_h_425_, v_lt_426_);
lean_dec(v_lt_426_);
return v_res_428_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim___redArg(lean_object* v_le_429_){
_start:
{
lean_inc(v_le_429_);
return v_le_429_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim___redArg___boxed(lean_object* v_le_430_){
_start:
{
lean_object* v_res_431_; 
v_res_431_ = lp_algalVerification_Algal_Source_BinOp_le_elim___redArg(v_le_430_);
lean_dec(v_le_430_);
return v_res_431_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim(lean_object* v_motive_432_, uint8_t v_t_433_, lean_object* v_h_434_, lean_object* v_le_435_){
_start:
{
lean_inc(v_le_435_);
return v_le_435_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_le_elim___boxed(lean_object* v_motive_436_, lean_object* v_t_437_, lean_object* v_h_438_, lean_object* v_le_439_){
_start:
{
uint8_t v_t_boxed_440_; lean_object* v_res_441_; 
v_t_boxed_440_ = lean_unbox(v_t_437_);
v_res_441_ = lp_algalVerification_Algal_Source_BinOp_le_elim(v_motive_436_, v_t_boxed_440_, v_h_438_, v_le_439_);
lean_dec(v_le_439_);
return v_res_441_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim___redArg(lean_object* v_gt_442_){
_start:
{
lean_inc(v_gt_442_);
return v_gt_442_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim___redArg___boxed(lean_object* v_gt_443_){
_start:
{
lean_object* v_res_444_; 
v_res_444_ = lp_algalVerification_Algal_Source_BinOp_gt_elim___redArg(v_gt_443_);
lean_dec(v_gt_443_);
return v_res_444_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim(lean_object* v_motive_445_, uint8_t v_t_446_, lean_object* v_h_447_, lean_object* v_gt_448_){
_start:
{
lean_inc(v_gt_448_);
return v_gt_448_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_gt_elim___boxed(lean_object* v_motive_449_, lean_object* v_t_450_, lean_object* v_h_451_, lean_object* v_gt_452_){
_start:
{
uint8_t v_t_boxed_453_; lean_object* v_res_454_; 
v_t_boxed_453_ = lean_unbox(v_t_450_);
v_res_454_ = lp_algalVerification_Algal_Source_BinOp_gt_elim(v_motive_449_, v_t_boxed_453_, v_h_451_, v_gt_452_);
lean_dec(v_gt_452_);
return v_res_454_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim___redArg(lean_object* v_ge_455_){
_start:
{
lean_inc(v_ge_455_);
return v_ge_455_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim___redArg___boxed(lean_object* v_ge_456_){
_start:
{
lean_object* v_res_457_; 
v_res_457_ = lp_algalVerification_Algal_Source_BinOp_ge_elim___redArg(v_ge_456_);
lean_dec(v_ge_456_);
return v_res_457_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim(lean_object* v_motive_458_, uint8_t v_t_459_, lean_object* v_h_460_, lean_object* v_ge_461_){
_start:
{
lean_inc(v_ge_461_);
return v_ge_461_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ge_elim___boxed(lean_object* v_motive_462_, lean_object* v_t_463_, lean_object* v_h_464_, lean_object* v_ge_465_){
_start:
{
uint8_t v_t_boxed_466_; lean_object* v_res_467_; 
v_t_boxed_466_ = lean_unbox(v_t_463_);
v_res_467_ = lp_algalVerification_Algal_Source_BinOp_ge_elim(v_motive_462_, v_t_boxed_466_, v_h_464_, v_ge_465_);
lean_dec(v_ge_465_);
return v_res_467_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim___redArg(lean_object* v_and_468_){
_start:
{
lean_inc(v_and_468_);
return v_and_468_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim___redArg___boxed(lean_object* v_and_469_){
_start:
{
lean_object* v_res_470_; 
v_res_470_ = lp_algalVerification_Algal_Source_BinOp_and_elim___redArg(v_and_469_);
lean_dec(v_and_469_);
return v_res_470_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim(lean_object* v_motive_471_, uint8_t v_t_472_, lean_object* v_h_473_, lean_object* v_and_474_){
_start:
{
lean_inc(v_and_474_);
return v_and_474_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_and_elim___boxed(lean_object* v_motive_475_, lean_object* v_t_476_, lean_object* v_h_477_, lean_object* v_and_478_){
_start:
{
uint8_t v_t_boxed_479_; lean_object* v_res_480_; 
v_t_boxed_479_ = lean_unbox(v_t_476_);
v_res_480_ = lp_algalVerification_Algal_Source_BinOp_and_elim(v_motive_475_, v_t_boxed_479_, v_h_477_, v_and_478_);
lean_dec(v_and_478_);
return v_res_480_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim___redArg(lean_object* v_or_481_){
_start:
{
lean_inc(v_or_481_);
return v_or_481_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim___redArg___boxed(lean_object* v_or_482_){
_start:
{
lean_object* v_res_483_; 
v_res_483_ = lp_algalVerification_Algal_Source_BinOp_or_elim___redArg(v_or_482_);
lean_dec(v_or_482_);
return v_res_483_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim(lean_object* v_motive_484_, uint8_t v_t_485_, lean_object* v_h_486_, lean_object* v_or_487_){
_start:
{
lean_inc(v_or_487_);
return v_or_487_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_or_elim___boxed(lean_object* v_motive_488_, lean_object* v_t_489_, lean_object* v_h_490_, lean_object* v_or_491_){
_start:
{
uint8_t v_t_boxed_492_; lean_object* v_res_493_; 
v_t_boxed_492_ = lean_unbox(v_t_489_);
v_res_493_ = lp_algalVerification_Algal_Source_BinOp_or_elim(v_motive_488_, v_t_boxed_492_, v_h_490_, v_or_491_);
lean_dec(v_or_491_);
return v_res_493_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim___redArg(lean_object* v_sconcat_494_){
_start:
{
lean_inc(v_sconcat_494_);
return v_sconcat_494_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim___redArg___boxed(lean_object* v_sconcat_495_){
_start:
{
lean_object* v_res_496_; 
v_res_496_ = lp_algalVerification_Algal_Source_BinOp_sconcat_elim___redArg(v_sconcat_495_);
lean_dec(v_sconcat_495_);
return v_res_496_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim(lean_object* v_motive_497_, uint8_t v_t_498_, lean_object* v_h_499_, lean_object* v_sconcat_500_){
_start:
{
lean_inc(v_sconcat_500_);
return v_sconcat_500_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_sconcat_elim___boxed(lean_object* v_motive_501_, lean_object* v_t_502_, lean_object* v_h_503_, lean_object* v_sconcat_504_){
_start:
{
uint8_t v_t_boxed_505_; lean_object* v_res_506_; 
v_t_boxed_505_ = lean_unbox(v_t_502_);
v_res_506_ = lp_algalVerification_Algal_Source_BinOp_sconcat_elim(v_motive_501_, v_t_boxed_505_, v_h_503_, v_sconcat_504_);
lean_dec(v_sconcat_504_);
return v_res_506_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_BinOp_ofNat(lean_object* v_n_507_){
_start:
{
lean_object* v___x_508_; uint8_t v___x_509_; 
v___x_508_ = lean_unsigned_to_nat(6u);
v___x_509_ = lean_nat_dec_le(v_n_507_, v___x_508_);
if (v___x_509_ == 0)
{
lean_object* v___x_510_; uint8_t v___x_511_; 
v___x_510_ = lean_unsigned_to_nat(9u);
v___x_511_ = lean_nat_dec_le(v_n_507_, v___x_510_);
if (v___x_511_ == 0)
{
lean_object* v___x_512_; uint8_t v___x_513_; 
v___x_512_ = lean_unsigned_to_nat(11u);
v___x_513_ = lean_nat_dec_le(v_n_507_, v___x_512_);
if (v___x_513_ == 0)
{
lean_object* v___x_514_; uint8_t v___x_515_; 
v___x_514_ = lean_unsigned_to_nat(12u);
v___x_515_ = lean_nat_dec_le(v_n_507_, v___x_514_);
if (v___x_515_ == 0)
{
uint8_t v___x_516_; 
v___x_516_ = 13;
return v___x_516_;
}
else
{
uint8_t v___x_517_; 
v___x_517_ = 12;
return v___x_517_;
}
}
else
{
lean_object* v___x_518_; uint8_t v___x_519_; 
v___x_518_ = lean_unsigned_to_nat(10u);
v___x_519_ = lean_nat_dec_le(v_n_507_, v___x_518_);
if (v___x_519_ == 0)
{
uint8_t v___x_520_; 
v___x_520_ = 11;
return v___x_520_;
}
else
{
uint8_t v___x_521_; 
v___x_521_ = 10;
return v___x_521_;
}
}
}
else
{
lean_object* v___x_522_; uint8_t v___x_523_; 
v___x_522_ = lean_unsigned_to_nat(7u);
v___x_523_ = lean_nat_dec_le(v_n_507_, v___x_522_);
if (v___x_523_ == 0)
{
lean_object* v___x_524_; uint8_t v___x_525_; 
v___x_524_ = lean_unsigned_to_nat(8u);
v___x_525_ = lean_nat_dec_le(v_n_507_, v___x_524_);
if (v___x_525_ == 0)
{
uint8_t v___x_526_; 
v___x_526_ = 9;
return v___x_526_;
}
else
{
uint8_t v___x_527_; 
v___x_527_ = 8;
return v___x_527_;
}
}
else
{
uint8_t v___x_528_; 
v___x_528_ = 7;
return v___x_528_;
}
}
}
else
{
lean_object* v___x_529_; uint8_t v___x_530_; 
v___x_529_ = lean_unsigned_to_nat(2u);
v___x_530_ = lean_nat_dec_le(v_n_507_, v___x_529_);
if (v___x_530_ == 0)
{
lean_object* v___x_531_; uint8_t v___x_532_; 
v___x_531_ = lean_unsigned_to_nat(4u);
v___x_532_ = lean_nat_dec_le(v_n_507_, v___x_531_);
if (v___x_532_ == 0)
{
lean_object* v___x_533_; uint8_t v___x_534_; 
v___x_533_ = lean_unsigned_to_nat(5u);
v___x_534_ = lean_nat_dec_le(v_n_507_, v___x_533_);
if (v___x_534_ == 0)
{
uint8_t v___x_535_; 
v___x_535_ = 6;
return v___x_535_;
}
else
{
uint8_t v___x_536_; 
v___x_536_ = 5;
return v___x_536_;
}
}
else
{
lean_object* v___x_537_; uint8_t v___x_538_; 
v___x_537_ = lean_unsigned_to_nat(3u);
v___x_538_ = lean_nat_dec_le(v_n_507_, v___x_537_);
if (v___x_538_ == 0)
{
uint8_t v___x_539_; 
v___x_539_ = 4;
return v___x_539_;
}
else
{
uint8_t v___x_540_; 
v___x_540_ = 3;
return v___x_540_;
}
}
}
else
{
lean_object* v___x_541_; uint8_t v___x_542_; 
v___x_541_ = lean_unsigned_to_nat(0u);
v___x_542_ = lean_nat_dec_le(v_n_507_, v___x_541_);
if (v___x_542_ == 0)
{
lean_object* v___x_543_; uint8_t v___x_544_; 
v___x_543_ = lean_unsigned_to_nat(1u);
v___x_544_ = lean_nat_dec_le(v_n_507_, v___x_543_);
if (v___x_544_ == 0)
{
uint8_t v___x_545_; 
v___x_545_ = 2;
return v___x_545_;
}
else
{
uint8_t v___x_546_; 
v___x_546_ = 1;
return v___x_546_;
}
}
else
{
uint8_t v___x_547_; 
v___x_547_ = 0;
return v___x_547_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_BinOp_ofNat___boxed(lean_object* v_n_548_){
_start:
{
uint8_t v_res_549_; lean_object* v_r_550_; 
v_res_549_ = lp_algalVerification_Algal_Source_BinOp_ofNat(v_n_548_);
lean_dec(v_n_548_);
v_r_550_ = lean_box(v_res_549_);
return v_r_550_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqBinOp(uint8_t v_x_551_, uint8_t v_y_552_){
_start:
{
lean_object* v___x_553_; lean_object* v___x_554_; uint8_t v___x_555_; 
v___x_553_ = lp_algalVerification_Algal_Source_BinOp_ctorIdx(v_x_551_);
v___x_554_ = lp_algalVerification_Algal_Source_BinOp_ctorIdx(v_y_552_);
v___x_555_ = lean_nat_dec_eq(v___x_553_, v___x_554_);
lean_dec(v___x_554_);
lean_dec(v___x_553_);
return v___x_555_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqBinOp___boxed(lean_object* v_x_556_, lean_object* v_y_557_){
_start:
{
uint8_t v_x_13__boxed_558_; uint8_t v_y_14__boxed_559_; uint8_t v_res_560_; lean_object* v_r_561_; 
v_x_13__boxed_558_ = lean_unbox(v_x_556_);
v_y_14__boxed_559_ = lean_unbox(v_y_557_);
v_res_560_ = lp_algalVerification_Algal_Source_instDecidableEqBinOp(v_x_13__boxed_558_, v_y_14__boxed_559_);
v_r_561_ = lean_box(v_res_560_);
return v_r_561_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr(uint8_t v_x_604_, lean_object* v_prec_605_){
_start:
{
lean_object* v___y_607_; lean_object* v___y_614_; lean_object* v___y_621_; lean_object* v___y_628_; lean_object* v___y_635_; lean_object* v___y_642_; lean_object* v___y_649_; lean_object* v___y_656_; lean_object* v___y_663_; lean_object* v___y_670_; lean_object* v___y_677_; lean_object* v___y_684_; lean_object* v___y_691_; lean_object* v___y_698_; 
switch(v_x_604_)
{
case 0:
{
lean_object* v___x_704_; uint8_t v___x_705_; 
v___x_704_ = lean_unsigned_to_nat(1024u);
v___x_705_ = lean_nat_dec_le(v___x_704_, v_prec_605_);
if (v___x_705_ == 0)
{
lean_object* v___x_706_; 
v___x_706_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_607_ = v___x_706_;
goto v___jp_606_;
}
else
{
lean_object* v___x_707_; 
v___x_707_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_607_ = v___x_707_;
goto v___jp_606_;
}
}
case 1:
{
lean_object* v___x_708_; uint8_t v___x_709_; 
v___x_708_ = lean_unsigned_to_nat(1024u);
v___x_709_ = lean_nat_dec_le(v___x_708_, v_prec_605_);
if (v___x_709_ == 0)
{
lean_object* v___x_710_; 
v___x_710_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_614_ = v___x_710_;
goto v___jp_613_;
}
else
{
lean_object* v___x_711_; 
v___x_711_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_614_ = v___x_711_;
goto v___jp_613_;
}
}
case 2:
{
lean_object* v___x_712_; uint8_t v___x_713_; 
v___x_712_ = lean_unsigned_to_nat(1024u);
v___x_713_ = lean_nat_dec_le(v___x_712_, v_prec_605_);
if (v___x_713_ == 0)
{
lean_object* v___x_714_; 
v___x_714_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_621_ = v___x_714_;
goto v___jp_620_;
}
else
{
lean_object* v___x_715_; 
v___x_715_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_621_ = v___x_715_;
goto v___jp_620_;
}
}
case 3:
{
lean_object* v___x_716_; uint8_t v___x_717_; 
v___x_716_ = lean_unsigned_to_nat(1024u);
v___x_717_ = lean_nat_dec_le(v___x_716_, v_prec_605_);
if (v___x_717_ == 0)
{
lean_object* v___x_718_; 
v___x_718_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_628_ = v___x_718_;
goto v___jp_627_;
}
else
{
lean_object* v___x_719_; 
v___x_719_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_628_ = v___x_719_;
goto v___jp_627_;
}
}
case 4:
{
lean_object* v___x_720_; uint8_t v___x_721_; 
v___x_720_ = lean_unsigned_to_nat(1024u);
v___x_721_ = lean_nat_dec_le(v___x_720_, v_prec_605_);
if (v___x_721_ == 0)
{
lean_object* v___x_722_; 
v___x_722_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_635_ = v___x_722_;
goto v___jp_634_;
}
else
{
lean_object* v___x_723_; 
v___x_723_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_635_ = v___x_723_;
goto v___jp_634_;
}
}
case 5:
{
lean_object* v___x_724_; uint8_t v___x_725_; 
v___x_724_ = lean_unsigned_to_nat(1024u);
v___x_725_ = lean_nat_dec_le(v___x_724_, v_prec_605_);
if (v___x_725_ == 0)
{
lean_object* v___x_726_; 
v___x_726_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_642_ = v___x_726_;
goto v___jp_641_;
}
else
{
lean_object* v___x_727_; 
v___x_727_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_642_ = v___x_727_;
goto v___jp_641_;
}
}
case 6:
{
lean_object* v___x_728_; uint8_t v___x_729_; 
v___x_728_ = lean_unsigned_to_nat(1024u);
v___x_729_ = lean_nat_dec_le(v___x_728_, v_prec_605_);
if (v___x_729_ == 0)
{
lean_object* v___x_730_; 
v___x_730_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_649_ = v___x_730_;
goto v___jp_648_;
}
else
{
lean_object* v___x_731_; 
v___x_731_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_649_ = v___x_731_;
goto v___jp_648_;
}
}
case 7:
{
lean_object* v___x_732_; uint8_t v___x_733_; 
v___x_732_ = lean_unsigned_to_nat(1024u);
v___x_733_ = lean_nat_dec_le(v___x_732_, v_prec_605_);
if (v___x_733_ == 0)
{
lean_object* v___x_734_; 
v___x_734_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_656_ = v___x_734_;
goto v___jp_655_;
}
else
{
lean_object* v___x_735_; 
v___x_735_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_656_ = v___x_735_;
goto v___jp_655_;
}
}
case 8:
{
lean_object* v___x_736_; uint8_t v___x_737_; 
v___x_736_ = lean_unsigned_to_nat(1024u);
v___x_737_ = lean_nat_dec_le(v___x_736_, v_prec_605_);
if (v___x_737_ == 0)
{
lean_object* v___x_738_; 
v___x_738_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_663_ = v___x_738_;
goto v___jp_662_;
}
else
{
lean_object* v___x_739_; 
v___x_739_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_663_ = v___x_739_;
goto v___jp_662_;
}
}
case 9:
{
lean_object* v___x_740_; uint8_t v___x_741_; 
v___x_740_ = lean_unsigned_to_nat(1024u);
v___x_741_ = lean_nat_dec_le(v___x_740_, v_prec_605_);
if (v___x_741_ == 0)
{
lean_object* v___x_742_; 
v___x_742_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_670_ = v___x_742_;
goto v___jp_669_;
}
else
{
lean_object* v___x_743_; 
v___x_743_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_670_ = v___x_743_;
goto v___jp_669_;
}
}
case 10:
{
lean_object* v___x_744_; uint8_t v___x_745_; 
v___x_744_ = lean_unsigned_to_nat(1024u);
v___x_745_ = lean_nat_dec_le(v___x_744_, v_prec_605_);
if (v___x_745_ == 0)
{
lean_object* v___x_746_; 
v___x_746_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_677_ = v___x_746_;
goto v___jp_676_;
}
else
{
lean_object* v___x_747_; 
v___x_747_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_677_ = v___x_747_;
goto v___jp_676_;
}
}
case 11:
{
lean_object* v___x_748_; uint8_t v___x_749_; 
v___x_748_ = lean_unsigned_to_nat(1024u);
v___x_749_ = lean_nat_dec_le(v___x_748_, v_prec_605_);
if (v___x_749_ == 0)
{
lean_object* v___x_750_; 
v___x_750_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_684_ = v___x_750_;
goto v___jp_683_;
}
else
{
lean_object* v___x_751_; 
v___x_751_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_684_ = v___x_751_;
goto v___jp_683_;
}
}
case 12:
{
lean_object* v___x_752_; uint8_t v___x_753_; 
v___x_752_ = lean_unsigned_to_nat(1024u);
v___x_753_ = lean_nat_dec_le(v___x_752_, v_prec_605_);
if (v___x_753_ == 0)
{
lean_object* v___x_754_; 
v___x_754_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_691_ = v___x_754_;
goto v___jp_690_;
}
else
{
lean_object* v___x_755_; 
v___x_755_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_691_ = v___x_755_;
goto v___jp_690_;
}
}
default: 
{
lean_object* v___x_756_; uint8_t v___x_757_; 
v___x_756_ = lean_unsigned_to_nat(1024u);
v___x_757_ = lean_nat_dec_le(v___x_756_, v_prec_605_);
if (v___x_757_ == 0)
{
lean_object* v___x_758_; 
v___x_758_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_698_ = v___x_758_;
goto v___jp_697_;
}
else
{
lean_object* v___x_759_; 
v___x_759_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_698_ = v___x_759_;
goto v___jp_697_;
}
}
}
v___jp_606_:
{
lean_object* v___x_608_; lean_object* v___x_609_; uint8_t v___x_610_; lean_object* v___x_611_; lean_object* v___x_612_; 
v___x_608_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__1));
lean_inc(v___y_607_);
v___x_609_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_609_, 0, v___y_607_);
lean_ctor_set(v___x_609_, 1, v___x_608_);
v___x_610_ = 0;
v___x_611_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_611_, 0, v___x_609_);
lean_ctor_set_uint8(v___x_611_, sizeof(void*)*1, v___x_610_);
v___x_612_ = l_Repr_addAppParen(v___x_611_, v_prec_605_);
return v___x_612_;
}
v___jp_613_:
{
lean_object* v___x_615_; lean_object* v___x_616_; uint8_t v___x_617_; lean_object* v___x_618_; lean_object* v___x_619_; 
v___x_615_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__3));
lean_inc(v___y_614_);
v___x_616_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_616_, 0, v___y_614_);
lean_ctor_set(v___x_616_, 1, v___x_615_);
v___x_617_ = 0;
v___x_618_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_618_, 0, v___x_616_);
lean_ctor_set_uint8(v___x_618_, sizeof(void*)*1, v___x_617_);
v___x_619_ = l_Repr_addAppParen(v___x_618_, v_prec_605_);
return v___x_619_;
}
v___jp_620_:
{
lean_object* v___x_622_; lean_object* v___x_623_; uint8_t v___x_624_; lean_object* v___x_625_; lean_object* v___x_626_; 
v___x_622_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__5));
lean_inc(v___y_621_);
v___x_623_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_623_, 0, v___y_621_);
lean_ctor_set(v___x_623_, 1, v___x_622_);
v___x_624_ = 0;
v___x_625_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_625_, 0, v___x_623_);
lean_ctor_set_uint8(v___x_625_, sizeof(void*)*1, v___x_624_);
v___x_626_ = l_Repr_addAppParen(v___x_625_, v_prec_605_);
return v___x_626_;
}
v___jp_627_:
{
lean_object* v___x_629_; lean_object* v___x_630_; uint8_t v___x_631_; lean_object* v___x_632_; lean_object* v___x_633_; 
v___x_629_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__7));
lean_inc(v___y_628_);
v___x_630_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_630_, 0, v___y_628_);
lean_ctor_set(v___x_630_, 1, v___x_629_);
v___x_631_ = 0;
v___x_632_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_632_, 0, v___x_630_);
lean_ctor_set_uint8(v___x_632_, sizeof(void*)*1, v___x_631_);
v___x_633_ = l_Repr_addAppParen(v___x_632_, v_prec_605_);
return v___x_633_;
}
v___jp_634_:
{
lean_object* v___x_636_; lean_object* v___x_637_; uint8_t v___x_638_; lean_object* v___x_639_; lean_object* v___x_640_; 
v___x_636_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__9));
lean_inc(v___y_635_);
v___x_637_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_637_, 0, v___y_635_);
lean_ctor_set(v___x_637_, 1, v___x_636_);
v___x_638_ = 0;
v___x_639_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_639_, 0, v___x_637_);
lean_ctor_set_uint8(v___x_639_, sizeof(void*)*1, v___x_638_);
v___x_640_ = l_Repr_addAppParen(v___x_639_, v_prec_605_);
return v___x_640_;
}
v___jp_641_:
{
lean_object* v___x_643_; lean_object* v___x_644_; uint8_t v___x_645_; lean_object* v___x_646_; lean_object* v___x_647_; 
v___x_643_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__11));
lean_inc(v___y_642_);
v___x_644_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_644_, 0, v___y_642_);
lean_ctor_set(v___x_644_, 1, v___x_643_);
v___x_645_ = 0;
v___x_646_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_646_, 0, v___x_644_);
lean_ctor_set_uint8(v___x_646_, sizeof(void*)*1, v___x_645_);
v___x_647_ = l_Repr_addAppParen(v___x_646_, v_prec_605_);
return v___x_647_;
}
v___jp_648_:
{
lean_object* v___x_650_; lean_object* v___x_651_; uint8_t v___x_652_; lean_object* v___x_653_; lean_object* v___x_654_; 
v___x_650_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__13));
lean_inc(v___y_649_);
v___x_651_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_651_, 0, v___y_649_);
lean_ctor_set(v___x_651_, 1, v___x_650_);
v___x_652_ = 0;
v___x_653_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_653_, 0, v___x_651_);
lean_ctor_set_uint8(v___x_653_, sizeof(void*)*1, v___x_652_);
v___x_654_ = l_Repr_addAppParen(v___x_653_, v_prec_605_);
return v___x_654_;
}
v___jp_655_:
{
lean_object* v___x_657_; lean_object* v___x_658_; uint8_t v___x_659_; lean_object* v___x_660_; lean_object* v___x_661_; 
v___x_657_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__15));
lean_inc(v___y_656_);
v___x_658_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_658_, 0, v___y_656_);
lean_ctor_set(v___x_658_, 1, v___x_657_);
v___x_659_ = 0;
v___x_660_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_660_, 0, v___x_658_);
lean_ctor_set_uint8(v___x_660_, sizeof(void*)*1, v___x_659_);
v___x_661_ = l_Repr_addAppParen(v___x_660_, v_prec_605_);
return v___x_661_;
}
v___jp_662_:
{
lean_object* v___x_664_; lean_object* v___x_665_; uint8_t v___x_666_; lean_object* v___x_667_; lean_object* v___x_668_; 
v___x_664_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__17));
lean_inc(v___y_663_);
v___x_665_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_665_, 0, v___y_663_);
lean_ctor_set(v___x_665_, 1, v___x_664_);
v___x_666_ = 0;
v___x_667_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_667_, 0, v___x_665_);
lean_ctor_set_uint8(v___x_667_, sizeof(void*)*1, v___x_666_);
v___x_668_ = l_Repr_addAppParen(v___x_667_, v_prec_605_);
return v___x_668_;
}
v___jp_669_:
{
lean_object* v___x_671_; lean_object* v___x_672_; uint8_t v___x_673_; lean_object* v___x_674_; lean_object* v___x_675_; 
v___x_671_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__19));
lean_inc(v___y_670_);
v___x_672_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_672_, 0, v___y_670_);
lean_ctor_set(v___x_672_, 1, v___x_671_);
v___x_673_ = 0;
v___x_674_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_674_, 0, v___x_672_);
lean_ctor_set_uint8(v___x_674_, sizeof(void*)*1, v___x_673_);
v___x_675_ = l_Repr_addAppParen(v___x_674_, v_prec_605_);
return v___x_675_;
}
v___jp_676_:
{
lean_object* v___x_678_; lean_object* v___x_679_; uint8_t v___x_680_; lean_object* v___x_681_; lean_object* v___x_682_; 
v___x_678_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__21));
lean_inc(v___y_677_);
v___x_679_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_679_, 0, v___y_677_);
lean_ctor_set(v___x_679_, 1, v___x_678_);
v___x_680_ = 0;
v___x_681_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_681_, 0, v___x_679_);
lean_ctor_set_uint8(v___x_681_, sizeof(void*)*1, v___x_680_);
v___x_682_ = l_Repr_addAppParen(v___x_681_, v_prec_605_);
return v___x_682_;
}
v___jp_683_:
{
lean_object* v___x_685_; lean_object* v___x_686_; uint8_t v___x_687_; lean_object* v___x_688_; lean_object* v___x_689_; 
v___x_685_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__23));
lean_inc(v___y_684_);
v___x_686_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_686_, 0, v___y_684_);
lean_ctor_set(v___x_686_, 1, v___x_685_);
v___x_687_ = 0;
v___x_688_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_688_, 0, v___x_686_);
lean_ctor_set_uint8(v___x_688_, sizeof(void*)*1, v___x_687_);
v___x_689_ = l_Repr_addAppParen(v___x_688_, v_prec_605_);
return v___x_689_;
}
v___jp_690_:
{
lean_object* v___x_692_; lean_object* v___x_693_; uint8_t v___x_694_; lean_object* v___x_695_; lean_object* v___x_696_; 
v___x_692_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__25));
lean_inc(v___y_691_);
v___x_693_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_693_, 0, v___y_691_);
lean_ctor_set(v___x_693_, 1, v___x_692_);
v___x_694_ = 0;
v___x_695_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_695_, 0, v___x_693_);
lean_ctor_set_uint8(v___x_695_, sizeof(void*)*1, v___x_694_);
v___x_696_ = l_Repr_addAppParen(v___x_695_, v_prec_605_);
return v___x_696_;
}
v___jp_697_:
{
lean_object* v___x_699_; lean_object* v___x_700_; uint8_t v___x_701_; lean_object* v___x_702_; lean_object* v___x_703_; 
v___x_699_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprBinOp_repr___closed__27));
lean_inc(v___y_698_);
v___x_700_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_700_, 0, v___y_698_);
lean_ctor_set(v___x_700_, 1, v___x_699_);
v___x_701_ = 0;
v___x_702_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_702_, 0, v___x_700_);
lean_ctor_set_uint8(v___x_702_, sizeof(void*)*1, v___x_701_);
v___x_703_ = l_Repr_addAppParen(v___x_702_, v_prec_605_);
return v___x_703_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprBinOp_repr___boxed(lean_object* v_x_760_, lean_object* v_prec_761_){
_start:
{
uint8_t v_x_789__boxed_762_; lean_object* v_res_763_; 
v_x_789__boxed_762_ = lean_unbox(v_x_760_);
v_res_763_ = lp_algalVerification_Algal_Source_instReprBinOp_repr(v_x_789__boxed_762_, v_prec_761_);
lean_dec(v_prec_761_);
return v_res_763_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorIdx(lean_object* v_x_766_){
_start:
{
switch(lean_obj_tag(v_x_766_))
{
case 0:
{
lean_object* v___x_767_; 
v___x_767_ = lean_unsigned_to_nat(0u);
return v___x_767_;
}
case 1:
{
lean_object* v___x_768_; 
v___x_768_ = lean_unsigned_to_nat(1u);
return v___x_768_;
}
case 2:
{
lean_object* v___x_769_; 
v___x_769_ = lean_unsigned_to_nat(2u);
return v___x_769_;
}
case 3:
{
lean_object* v___x_770_; 
v___x_770_ = lean_unsigned_to_nat(3u);
return v___x_770_;
}
case 4:
{
lean_object* v___x_771_; 
v___x_771_ = lean_unsigned_to_nat(4u);
return v___x_771_;
}
case 5:
{
lean_object* v___x_772_; 
v___x_772_ = lean_unsigned_to_nat(5u);
return v___x_772_;
}
case 6:
{
lean_object* v___x_773_; 
v___x_773_ = lean_unsigned_to_nat(6u);
return v___x_773_;
}
case 7:
{
lean_object* v___x_774_; 
v___x_774_ = lean_unsigned_to_nat(7u);
return v___x_774_;
}
case 8:
{
lean_object* v___x_775_; 
v___x_775_ = lean_unsigned_to_nat(8u);
return v___x_775_;
}
case 9:
{
lean_object* v___x_776_; 
v___x_776_ = lean_unsigned_to_nat(9u);
return v___x_776_;
}
case 10:
{
lean_object* v___x_777_; 
v___x_777_ = lean_unsigned_to_nat(10u);
return v___x_777_;
}
case 11:
{
lean_object* v___x_778_; 
v___x_778_ = lean_unsigned_to_nat(11u);
return v___x_778_;
}
case 12:
{
lean_object* v___x_779_; 
v___x_779_ = lean_unsigned_to_nat(12u);
return v___x_779_;
}
default: 
{
lean_object* v___x_780_; 
v___x_780_ = lean_unsigned_to_nat(13u);
return v___x_780_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorIdx___boxed(lean_object* v_x_781_){
_start:
{
lean_object* v_res_782_; 
v_res_782_ = lp_algalVerification_Algal_Source_Expr_ctorIdx(v_x_781_);
lean_dec_ref(v_x_781_);
return v_res_782_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(lean_object* v_t_783_, lean_object* v_k_784_){
_start:
{
switch(lean_obj_tag(v_t_783_))
{
case 1:
{
lean_object* v_n_785_; lean_object* v___x_786_; 
v_n_785_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_n_785_);
lean_dec_ref_known(v_t_783_, 1);
v___x_786_ = lean_apply_1(v_k_784_, v_n_785_);
return v___x_786_;
}
case 2:
{
lean_object* v_value_787_; lean_object* v_name_788_; lean_object* v___x_789_; 
v_value_787_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_value_787_);
v_name_788_ = lean_ctor_get(v_t_783_, 1);
lean_inc_ref(v_name_788_);
lean_dec_ref_known(v_t_783_, 2);
v___x_789_ = lean_apply_2(v_k_784_, v_value_787_, v_name_788_);
return v___x_789_;
}
case 3:
{
lean_object* v_value_790_; lean_object* v_label_791_; lean_object* v___x_792_; 
v_value_790_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_value_790_);
v_label_791_ = lean_ctor_get(v_t_783_, 1);
lean_inc_ref(v_label_791_);
lean_dec_ref_known(v_t_783_, 2);
v___x_792_ = lean_apply_2(v_k_784_, v_value_790_, v_label_791_);
return v___x_792_;
}
case 4:
{
uint8_t v_op_793_; lean_object* v_value_794_; lean_object* v___x_795_; lean_object* v___x_796_; 
v_op_793_ = lean_ctor_get_uint8(v_t_783_, sizeof(void*)*1);
v_value_794_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_value_794_);
lean_dec_ref_known(v_t_783_, 1);
v___x_795_ = lean_box(v_op_793_);
v___x_796_ = lean_apply_2(v_k_784_, v___x_795_, v_value_794_);
return v___x_796_;
}
case 5:
{
uint8_t v_op_797_; lean_object* v_left_798_; lean_object* v_right_799_; lean_object* v___x_800_; lean_object* v___x_801_; 
v_op_797_ = lean_ctor_get_uint8(v_t_783_, sizeof(void*)*2);
v_left_798_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_left_798_);
v_right_799_ = lean_ctor_get(v_t_783_, 1);
lean_inc_ref(v_right_799_);
lean_dec_ref_known(v_t_783_, 2);
v___x_800_ = lean_box(v_op_797_);
v___x_801_ = lean_apply_3(v_k_784_, v___x_800_, v_left_798_, v_right_799_);
return v___x_801_;
}
case 8:
{
lean_object* v_condition_802_; lean_object* v_yes_803_; lean_object* v_no_804_; lean_object* v___x_805_; 
v_condition_802_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_condition_802_);
v_yes_803_ = lean_ctor_get(v_t_783_, 1);
lean_inc_ref(v_yes_803_);
v_no_804_ = lean_ctor_get(v_t_783_, 2);
lean_inc_ref(v_no_804_);
lean_dec_ref_known(v_t_783_, 3);
v___x_805_ = lean_apply_3(v_k_784_, v_condition_802_, v_yes_803_, v_no_804_);
return v___x_805_;
}
case 9:
{
lean_object* v_value_806_; lean_object* v_arms_807_; lean_object* v___x_808_; 
v_value_806_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_value_806_);
v_arms_807_ = lean_ctor_get(v_t_783_, 1);
lean_inc(v_arms_807_);
lean_dec_ref_known(v_t_783_, 2);
v___x_808_ = lean_apply_2(v_k_784_, v_value_806_, v_arms_807_);
return v___x_808_;
}
case 10:
{
lean_object* v_question_809_; lean_object* v_context_810_; lean_object* v_criteria_811_; lean_object* v___x_812_; 
v_question_809_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_question_809_);
v_context_810_ = lean_ctor_get(v_t_783_, 1);
lean_inc_ref(v_context_810_);
v_criteria_811_ = lean_ctor_get(v_t_783_, 2);
lean_inc(v_criteria_811_);
lean_dec_ref_known(v_t_783_, 3);
v___x_812_ = lean_apply_3(v_k_784_, v_question_809_, v_context_810_, v_criteria_811_);
return v___x_812_;
}
case 11:
{
lean_object* v_instruction_813_; lean_object* v_context_814_; lean_object* v___x_815_; 
v_instruction_813_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_instruction_813_);
v_context_814_ = lean_ctor_get(v_t_783_, 1);
lean_inc_ref(v_context_814_);
lean_dec_ref_known(v_t_783_, 2);
v___x_815_ = lean_apply_2(v_k_784_, v_instruction_813_, v_context_814_);
return v___x_815_;
}
case 12:
{
lean_object* v_alias_816_; lean_object* v_args_817_; lean_object* v___x_818_; 
v_alias_816_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_alias_816_);
v_args_817_ = lean_ctor_get(v_t_783_, 1);
lean_inc(v_args_817_);
lean_dec_ref_known(v_t_783_, 2);
v___x_818_ = lean_apply_2(v_k_784_, v_alias_816_, v_args_817_);
return v___x_818_;
}
case 13:
{
lean_object* v_alias_819_; lean_object* v_over_820_; lean_object* v_items_821_; lean_object* v_args_822_; lean_object* v_maxItems_823_; lean_object* v___x_824_; 
v_alias_819_ = lean_ctor_get(v_t_783_, 0);
lean_inc_ref(v_alias_819_);
v_over_820_ = lean_ctor_get(v_t_783_, 1);
lean_inc_ref(v_over_820_);
v_items_821_ = lean_ctor_get(v_t_783_, 2);
lean_inc_ref(v_items_821_);
v_args_822_ = lean_ctor_get(v_t_783_, 3);
lean_inc(v_args_822_);
v_maxItems_823_ = lean_ctor_get(v_t_783_, 4);
lean_inc(v_maxItems_823_);
lean_dec_ref_known(v_t_783_, 5);
v___x_824_ = lean_apply_5(v_k_784_, v_alias_819_, v_over_820_, v_items_821_, v_args_822_, v_maxItems_823_);
return v___x_824_;
}
default: 
{
lean_object* v_value_825_; lean_object* v___x_826_; 
v_value_825_ = lean_ctor_get(v_t_783_, 0);
lean_inc(v_value_825_);
lean_dec_ref(v_t_783_);
v___x_826_ = lean_apply_1(v_k_784_, v_value_825_);
return v___x_826_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorElim(lean_object* v_motive__1_827_, lean_object* v_ctorIdx_828_, lean_object* v_t_829_, lean_object* v_h_830_, lean_object* v_k_831_){
_start:
{
lean_object* v___x_832_; 
v___x_832_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_829_, v_k_831_);
return v___x_832_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_ctorElim___boxed(lean_object* v_motive__1_833_, lean_object* v_ctorIdx_834_, lean_object* v_t_835_, lean_object* v_h_836_, lean_object* v_k_837_){
_start:
{
lean_object* v_res_838_; 
v_res_838_ = lp_algalVerification_Algal_Source_Expr_ctorElim(v_motive__1_833_, v_ctorIdx_834_, v_t_835_, v_h_836_, v_k_837_);
lean_dec(v_ctorIdx_834_);
return v_res_838_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_lit_elim___redArg(lean_object* v_t_839_, lean_object* v_lit_840_){
_start:
{
lean_object* v___x_841_; 
v___x_841_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_839_, v_lit_840_);
return v___x_841_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_lit_elim(lean_object* v_motive__1_842_, lean_object* v_t_843_, lean_object* v_h_844_, lean_object* v_lit_845_){
_start:
{
lean_object* v___x_846_; 
v___x_846_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_843_, v_lit_845_);
return v___x_846_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_name_elim___redArg(lean_object* v_t_847_, lean_object* v_name_848_){
_start:
{
lean_object* v___x_849_; 
v___x_849_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_847_, v_name_848_);
return v___x_849_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_name_elim(lean_object* v_motive__1_850_, lean_object* v_t_851_, lean_object* v_h_852_, lean_object* v_name_853_){
_start:
{
lean_object* v___x_854_; 
v___x_854_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_851_, v_name_853_);
return v___x_854_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_field_elim___redArg(lean_object* v_t_855_, lean_object* v_field_856_){
_start:
{
lean_object* v___x_857_; 
v___x_857_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_855_, v_field_856_);
return v___x_857_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_field_elim(lean_object* v_motive__1_858_, lean_object* v_t_859_, lean_object* v_h_860_, lean_object* v_field_861_){
_start:
{
lean_object* v___x_862_; 
v___x_862_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_859_, v_field_861_);
return v___x_862_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_probability_elim___redArg(lean_object* v_t_863_, lean_object* v_probability_864_){
_start:
{
lean_object* v___x_865_; 
v___x_865_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_863_, v_probability_864_);
return v___x_865_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_probability_elim(lean_object* v_motive__1_866_, lean_object* v_t_867_, lean_object* v_h_868_, lean_object* v_probability_869_){
_start:
{
lean_object* v___x_870_; 
v___x_870_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_867_, v_probability_869_);
return v___x_870_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_unary_elim___redArg(lean_object* v_t_871_, lean_object* v_unary_872_){
_start:
{
lean_object* v___x_873_; 
v___x_873_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_871_, v_unary_872_);
return v___x_873_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_unary_elim(lean_object* v_motive__1_874_, lean_object* v_t_875_, lean_object* v_h_876_, lean_object* v_unary_877_){
_start:
{
lean_object* v___x_878_; 
v___x_878_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_875_, v_unary_877_);
return v___x_878_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_binary_elim___redArg(lean_object* v_t_879_, lean_object* v_binary_880_){
_start:
{
lean_object* v___x_881_; 
v___x_881_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_879_, v_binary_880_);
return v___x_881_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_binary_elim(lean_object* v_motive__1_882_, lean_object* v_t_883_, lean_object* v_h_884_, lean_object* v_binary_885_){
_start:
{
lean_object* v___x_886_; 
v___x_886_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_883_, v_binary_885_);
return v___x_886_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_record_elim___redArg(lean_object* v_t_887_, lean_object* v_record_888_){
_start:
{
lean_object* v___x_889_; 
v___x_889_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_887_, v_record_888_);
return v___x_889_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_record_elim(lean_object* v_motive__1_890_, lean_object* v_t_891_, lean_object* v_h_892_, lean_object* v_record_893_){
_start:
{
lean_object* v___x_894_; 
v___x_894_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_891_, v_record_893_);
return v___x_894_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_list_elim___redArg(lean_object* v_t_895_, lean_object* v_list_896_){
_start:
{
lean_object* v___x_897_; 
v___x_897_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_895_, v_list_896_);
return v___x_897_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_list_elim(lean_object* v_motive__1_898_, lean_object* v_t_899_, lean_object* v_h_900_, lean_object* v_list_901_){
_start:
{
lean_object* v___x_902_; 
v___x_902_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_899_, v_list_901_);
return v___x_902_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_if___00elim___redArg(lean_object* v_t_903_, lean_object* v_if___904_){
_start:
{
lean_object* v___x_905_; 
v___x_905_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_903_, v_if___904_);
return v___x_905_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_if___00elim(lean_object* v_motive__1_906_, lean_object* v_t_907_, lean_object* v_h_908_, lean_object* v_if___909_){
_start:
{
lean_object* v___x_910_; 
v___x_910_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_907_, v_if___909_);
return v___x_910_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_match___00elim___redArg(lean_object* v_t_911_, lean_object* v_match___912_){
_start:
{
lean_object* v___x_913_; 
v___x_913_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_911_, v_match___912_);
return v___x_913_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_match___00elim(lean_object* v_motive__1_914_, lean_object* v_t_915_, lean_object* v_h_916_, lean_object* v_match___917_){
_start:
{
lean_object* v___x_918_; 
v___x_918_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_915_, v_match___917_);
return v___x_918_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_decide_elim___redArg(lean_object* v_t_919_, lean_object* v_decide_920_){
_start:
{
lean_object* v___x_921_; 
v___x_921_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_919_, v_decide_920_);
return v___x_921_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_decide_elim(lean_object* v_motive__1_922_, lean_object* v_t_923_, lean_object* v_h_924_, lean_object* v_decide_925_){
_start:
{
lean_object* v___x_926_; 
v___x_926_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_923_, v_decide_925_);
return v___x_926_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_generate_elim___redArg(lean_object* v_t_927_, lean_object* v_generate_928_){
_start:
{
lean_object* v___x_929_; 
v___x_929_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_927_, v_generate_928_);
return v___x_929_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_generate_elim(lean_object* v_motive__1_930_, lean_object* v_t_931_, lean_object* v_h_932_, lean_object* v_generate_933_){
_start:
{
lean_object* v___x_934_; 
v___x_934_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_931_, v_generate_933_);
return v___x_934_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_call_elim___redArg(lean_object* v_t_935_, lean_object* v_call_936_){
_start:
{
lean_object* v___x_937_; 
v___x_937_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_935_, v_call_936_);
return v___x_937_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_call_elim(lean_object* v_motive__1_938_, lean_object* v_t_939_, lean_object* v_h_940_, lean_object* v_call_941_){
_start:
{
lean_object* v___x_942_; 
v___x_942_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_939_, v_call_941_);
return v___x_942_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_each_elim___redArg(lean_object* v_t_943_, lean_object* v_each_944_){
_start:
{
lean_object* v___x_945_; 
v___x_945_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_943_, v_each_944_);
return v___x_945_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_Expr_each_elim(lean_object* v_motive__1_946_, lean_object* v_t_947_, lean_object* v_h_948_, lean_object* v_each_949_){
_start:
{
lean_object* v___x_950_; 
v___x_950_ = lp_algalVerification_Algal_Source_Expr_ctorElim___redArg(v_t_947_, v_each_949_);
return v___x_950_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_hasEffectEntries(lean_object* v_x_951_){
_start:
{
if (lean_obj_tag(v_x_951_) == 0)
{
uint8_t v___x_952_; 
v___x_952_ = 0;
return v___x_952_;
}
else
{
lean_object* v_head_953_; lean_object* v_tail_954_; lean_object* v_snd_955_; uint8_t v___x_956_; 
v_head_953_ = lean_ctor_get(v_x_951_, 0);
v_tail_954_ = lean_ctor_get(v_x_951_, 1);
v_snd_955_ = lean_ctor_get(v_head_953_, 1);
v___x_956_ = lp_algalVerification_Algal_Source_hasEffect(v_snd_955_);
if (v___x_956_ == 0)
{
v_x_951_ = v_tail_954_;
goto _start;
}
else
{
return v___x_956_;
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_hasEffect(lean_object* v_x_958_){
_start:
{
switch(lean_obj_tag(v_x_958_))
{
case 0:
{
uint8_t v___x_959_; 
v___x_959_ = 0;
return v___x_959_;
}
case 1:
{
uint8_t v___x_960_; 
v___x_960_ = 0;
return v___x_960_;
}
case 2:
{
lean_object* v_value_961_; 
v_value_961_ = lean_ctor_get(v_x_958_, 0);
v_x_958_ = v_value_961_;
goto _start;
}
case 3:
{
lean_object* v_value_963_; lean_object* v_label_964_; uint8_t v___x_965_; 
v_value_963_ = lean_ctor_get(v_x_958_, 0);
v_label_964_ = lean_ctor_get(v_x_958_, 1);
v___x_965_ = lp_algalVerification_Algal_Source_hasEffect(v_value_963_);
if (v___x_965_ == 0)
{
v_x_958_ = v_label_964_;
goto _start;
}
else
{
return v___x_965_;
}
}
case 4:
{
lean_object* v_value_967_; 
v_value_967_ = lean_ctor_get(v_x_958_, 0);
v_x_958_ = v_value_967_;
goto _start;
}
case 5:
{
lean_object* v_left_969_; lean_object* v_right_970_; uint8_t v___x_971_; 
v_left_969_ = lean_ctor_get(v_x_958_, 0);
v_right_970_ = lean_ctor_get(v_x_958_, 1);
v___x_971_ = lp_algalVerification_Algal_Source_hasEffect(v_left_969_);
if (v___x_971_ == 0)
{
v_x_958_ = v_right_970_;
goto _start;
}
else
{
return v___x_971_;
}
}
case 6:
{
lean_object* v_entries_973_; uint8_t v___x_974_; 
v_entries_973_ = lean_ctor_get(v_x_958_, 0);
v___x_974_ = lp_algalVerification_Algal_Source_hasEffectEntries(v_entries_973_);
return v___x_974_;
}
case 7:
{
lean_object* v_items_975_; uint8_t v___x_976_; 
v_items_975_ = lean_ctor_get(v_x_958_, 0);
v___x_976_ = lp_algalVerification_Algal_Source_hasEffectList(v_items_975_);
return v___x_976_;
}
case 8:
{
lean_object* v_condition_977_; lean_object* v_yes_978_; lean_object* v_no_979_; uint8_t v___y_981_; uint8_t v___x_983_; 
v_condition_977_ = lean_ctor_get(v_x_958_, 0);
v_yes_978_ = lean_ctor_get(v_x_958_, 1);
v_no_979_ = lean_ctor_get(v_x_958_, 2);
v___x_983_ = lp_algalVerification_Algal_Source_hasEffect(v_condition_977_);
if (v___x_983_ == 0)
{
uint8_t v___x_984_; 
v___x_984_ = lp_algalVerification_Algal_Source_hasEffect(v_yes_978_);
v___y_981_ = v___x_984_;
goto v___jp_980_;
}
else
{
v___y_981_ = v___x_983_;
goto v___jp_980_;
}
v___jp_980_:
{
if (v___y_981_ == 0)
{
v_x_958_ = v_no_979_;
goto _start;
}
else
{
return v___y_981_;
}
}
}
case 9:
{
lean_object* v_value_985_; lean_object* v_arms_986_; uint8_t v___x_987_; 
v_value_985_ = lean_ctor_get(v_x_958_, 0);
v_arms_986_ = lean_ctor_get(v_x_958_, 1);
v___x_987_ = lp_algalVerification_Algal_Source_hasEffect(v_value_985_);
if (v___x_987_ == 0)
{
uint8_t v___x_988_; 
v___x_988_ = lp_algalVerification_Algal_Source_hasEffectEntries(v_arms_986_);
return v___x_988_;
}
else
{
return v___x_987_;
}
}
default: 
{
uint8_t v___x_989_; 
v___x_989_ = 1;
return v___x_989_;
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_hasEffectList(lean_object* v_x_990_){
_start:
{
if (lean_obj_tag(v_x_990_) == 0)
{
uint8_t v___x_991_; 
v___x_991_ = 0;
return v___x_991_;
}
else
{
lean_object* v_head_992_; lean_object* v_tail_993_; uint8_t v___x_994_; 
v_head_992_ = lean_ctor_get(v_x_990_, 0);
v_tail_993_ = lean_ctor_get(v_x_990_, 1);
v___x_994_ = lp_algalVerification_Algal_Source_hasEffect(v_head_992_);
if (v___x_994_ == 0)
{
v_x_990_ = v_tail_993_;
goto _start;
}
else
{
return v___x_994_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_hasEffectList___boxed(lean_object* v_x_996_){
_start:
{
uint8_t v_res_997_; lean_object* v_r_998_; 
v_res_997_ = lp_algalVerification_Algal_Source_hasEffectList(v_x_996_);
lean_dec(v_x_996_);
v_r_998_ = lean_box(v_res_997_);
return v_r_998_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_hasEffectEntries___boxed(lean_object* v_x_999_){
_start:
{
uint8_t v_res_1000_; lean_object* v_r_1001_; 
v_res_1000_ = lp_algalVerification_Algal_Source_hasEffectEntries(v_x_999_);
lean_dec(v_x_999_);
v_r_1001_ = lean_box(v_res_1000_);
return v_r_1001_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_hasEffect___boxed(lean_object* v_x_1002_){
_start:
{
uint8_t v_res_1003_; lean_object* v_r_1004_; 
v_res_1003_ = lp_algalVerification_Algal_Source_hasEffect(v_x_1002_);
lean_dec_ref(v_x_1002_);
v_r_1004_ = lean_box(v_res_1003_);
return v_r_1004_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_callsEntries(lean_object* v_resolve_1005_, lean_object* v_x_1006_){
_start:
{
if (lean_obj_tag(v_x_1006_) == 0)
{
lean_object* v___x_1007_; 
lean_dec_ref(v_resolve_1005_);
v___x_1007_ = lean_unsigned_to_nat(0u);
return v___x_1007_;
}
else
{
lean_object* v_head_1008_; lean_object* v_tail_1009_; lean_object* v_snd_1010_; lean_object* v___x_1011_; lean_object* v___x_1012_; lean_object* v___x_1013_; 
v_head_1008_ = lean_ctor_get(v_x_1006_, 0);
lean_inc(v_head_1008_);
v_tail_1009_ = lean_ctor_get(v_x_1006_, 1);
lean_inc(v_tail_1009_);
lean_dec_ref_known(v_x_1006_, 2);
v_snd_1010_ = lean_ctor_get(v_head_1008_, 1);
lean_inc(v_snd_1010_);
lean_dec(v_head_1008_);
lean_inc_ref(v_resolve_1005_);
v___x_1011_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1005_, v_snd_1010_);
v___x_1012_ = lp_algalVerification_Algal_Source_callsEntries(v_resolve_1005_, v_tail_1009_);
v___x_1013_ = lean_nat_add(v___x_1011_, v___x_1012_);
lean_dec(v___x_1012_);
lean_dec(v___x_1011_);
return v___x_1013_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_callsExpr(lean_object* v_resolve_1014_, lean_object* v_x_1015_){
_start:
{
switch(lean_obj_tag(v_x_1015_))
{
case 2:
{
lean_object* v_value_1016_; 
v_value_1016_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_value_1016_);
lean_dec_ref_known(v_x_1015_, 2);
v_x_1015_ = v_value_1016_;
goto _start;
}
case 3:
{
lean_object* v_value_1018_; lean_object* v_label_1019_; lean_object* v___x_1020_; lean_object* v___x_1021_; lean_object* v___x_1022_; 
v_value_1018_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_value_1018_);
v_label_1019_ = lean_ctor_get(v_x_1015_, 1);
lean_inc_ref(v_label_1019_);
lean_dec_ref_known(v_x_1015_, 2);
lean_inc_ref(v_resolve_1014_);
v___x_1020_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_value_1018_);
v___x_1021_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_label_1019_);
v___x_1022_ = lean_nat_add(v___x_1020_, v___x_1021_);
lean_dec(v___x_1021_);
lean_dec(v___x_1020_);
return v___x_1022_;
}
case 4:
{
lean_object* v_value_1023_; 
v_value_1023_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_value_1023_);
lean_dec_ref_known(v_x_1015_, 1);
v_x_1015_ = v_value_1023_;
goto _start;
}
case 5:
{
lean_object* v_left_1025_; lean_object* v_right_1026_; lean_object* v___x_1027_; lean_object* v___x_1028_; lean_object* v___x_1029_; 
v_left_1025_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_left_1025_);
v_right_1026_ = lean_ctor_get(v_x_1015_, 1);
lean_inc_ref(v_right_1026_);
lean_dec_ref_known(v_x_1015_, 2);
lean_inc_ref(v_resolve_1014_);
v___x_1027_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_left_1025_);
v___x_1028_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_right_1026_);
v___x_1029_ = lean_nat_add(v___x_1027_, v___x_1028_);
lean_dec(v___x_1028_);
lean_dec(v___x_1027_);
return v___x_1029_;
}
case 6:
{
lean_object* v_entries_1030_; lean_object* v___x_1031_; 
v_entries_1030_ = lean_ctor_get(v_x_1015_, 0);
lean_inc(v_entries_1030_);
lean_dec_ref_known(v_x_1015_, 1);
v___x_1031_ = lp_algalVerification_Algal_Source_callsEntries(v_resolve_1014_, v_entries_1030_);
return v___x_1031_;
}
case 7:
{
lean_object* v_items_1032_; lean_object* v___x_1033_; 
v_items_1032_ = lean_ctor_get(v_x_1015_, 0);
lean_inc(v_items_1032_);
lean_dec_ref_known(v_x_1015_, 1);
v___x_1033_ = lp_algalVerification_Algal_Source_callsItems(v_resolve_1014_, v_items_1032_);
return v___x_1033_;
}
case 8:
{
lean_object* v_condition_1034_; lean_object* v_yes_1035_; lean_object* v_no_1036_; lean_object* v___x_1037_; lean_object* v___x_1038_; lean_object* v___x_1039_; lean_object* v___x_1040_; lean_object* v___x_1041_; 
v_condition_1034_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_condition_1034_);
v_yes_1035_ = lean_ctor_get(v_x_1015_, 1);
lean_inc_ref(v_yes_1035_);
v_no_1036_ = lean_ctor_get(v_x_1015_, 2);
lean_inc_ref(v_no_1036_);
lean_dec_ref_known(v_x_1015_, 3);
lean_inc_ref_n(v_resolve_1014_, 2);
v___x_1037_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_condition_1034_);
v___x_1038_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_yes_1035_);
v___x_1039_ = lean_nat_add(v___x_1037_, v___x_1038_);
lean_dec(v___x_1038_);
lean_dec(v___x_1037_);
v___x_1040_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_no_1036_);
v___x_1041_ = lean_nat_add(v___x_1039_, v___x_1040_);
lean_dec(v___x_1040_);
lean_dec(v___x_1039_);
return v___x_1041_;
}
case 9:
{
lean_object* v_value_1042_; lean_object* v_arms_1043_; lean_object* v___x_1044_; lean_object* v___x_1045_; lean_object* v___x_1046_; 
v_value_1042_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_value_1042_);
v_arms_1043_ = lean_ctor_get(v_x_1015_, 1);
lean_inc(v_arms_1043_);
lean_dec_ref_known(v_x_1015_, 2);
lean_inc_ref(v_resolve_1014_);
v___x_1044_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_value_1042_);
v___x_1045_ = lp_algalVerification_Algal_Source_callsEntries(v_resolve_1014_, v_arms_1043_);
v___x_1046_ = lean_nat_add(v___x_1044_, v___x_1045_);
lean_dec(v___x_1045_);
lean_dec(v___x_1044_);
return v___x_1046_;
}
case 10:
{
lean_object* v_context_1047_; lean_object* v___x_1048_; lean_object* v___x_1049_; lean_object* v___x_1050_; 
v_context_1047_ = lean_ctor_get(v_x_1015_, 1);
lean_inc_ref(v_context_1047_);
lean_dec_ref_known(v_x_1015_, 3);
v___x_1048_ = lean_unsigned_to_nat(1u);
v___x_1049_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_context_1047_);
v___x_1050_ = lean_nat_add(v___x_1048_, v___x_1049_);
lean_dec(v___x_1049_);
return v___x_1050_;
}
case 11:
{
lean_object* v_instruction_1051_; lean_object* v_context_1052_; lean_object* v___x_1053_; lean_object* v___x_1054_; lean_object* v___x_1055_; lean_object* v___x_1056_; lean_object* v___x_1057_; 
v_instruction_1051_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_instruction_1051_);
v_context_1052_ = lean_ctor_get(v_x_1015_, 1);
lean_inc_ref(v_context_1052_);
lean_dec_ref_known(v_x_1015_, 2);
v___x_1053_ = lean_unsigned_to_nat(1u);
lean_inc_ref(v_resolve_1014_);
v___x_1054_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_instruction_1051_);
v___x_1055_ = lean_nat_add(v___x_1053_, v___x_1054_);
lean_dec(v___x_1054_);
v___x_1056_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_context_1052_);
v___x_1057_ = lean_nat_add(v___x_1055_, v___x_1056_);
lean_dec(v___x_1056_);
lean_dec(v___x_1055_);
return v___x_1057_;
}
case 12:
{
lean_object* v_alias_1058_; lean_object* v___x_1059_; 
v_alias_1058_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_alias_1058_);
lean_dec_ref_known(v_x_1015_, 2);
v___x_1059_ = lean_apply_1(v_resolve_1014_, v_alias_1058_);
if (lean_obj_tag(v___x_1059_) == 0)
{
lean_object* v___x_1060_; 
v___x_1060_ = lean_unsigned_to_nat(0u);
return v___x_1060_;
}
else
{
lean_object* v_val_1061_; lean_object* v_fst_1062_; 
v_val_1061_ = lean_ctor_get(v___x_1059_, 0);
lean_inc(v_val_1061_);
lean_dec_ref_known(v___x_1059_, 1);
v_fst_1062_ = lean_ctor_get(v_val_1061_, 0);
lean_inc(v_fst_1062_);
lean_dec(v_val_1061_);
return v_fst_1062_;
}
}
case 13:
{
lean_object* v_alias_1063_; lean_object* v_items_1064_; lean_object* v_args_1065_; lean_object* v_maxItems_1066_; lean_object* v___x_1067_; lean_object* v___x_1068_; lean_object* v___x_1069_; lean_object* v___y_1071_; lean_object* v___x_1074_; 
v_alias_1063_ = lean_ctor_get(v_x_1015_, 0);
lean_inc_ref(v_alias_1063_);
v_items_1064_ = lean_ctor_get(v_x_1015_, 2);
lean_inc_ref(v_items_1064_);
v_args_1065_ = lean_ctor_get(v_x_1015_, 3);
lean_inc(v_args_1065_);
v_maxItems_1066_ = lean_ctor_get(v_x_1015_, 4);
lean_inc(v_maxItems_1066_);
lean_dec_ref_known(v_x_1015_, 5);
lean_inc_ref_n(v_resolve_1014_, 2);
v___x_1067_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1014_, v_items_1064_);
v___x_1068_ = lp_algalVerification_Algal_Source_callsEntries(v_resolve_1014_, v_args_1065_);
v___x_1069_ = lean_nat_add(v___x_1067_, v___x_1068_);
lean_dec(v___x_1068_);
lean_dec(v___x_1067_);
v___x_1074_ = lean_apply_1(v_resolve_1014_, v_alias_1063_);
if (lean_obj_tag(v___x_1074_) == 0)
{
lean_object* v___x_1075_; 
v___x_1075_ = lean_unsigned_to_nat(0u);
v___y_1071_ = v___x_1075_;
goto v___jp_1070_;
}
else
{
lean_object* v_val_1076_; lean_object* v_fst_1077_; 
v_val_1076_ = lean_ctor_get(v___x_1074_, 0);
lean_inc(v_val_1076_);
lean_dec_ref_known(v___x_1074_, 1);
v_fst_1077_ = lean_ctor_get(v_val_1076_, 0);
lean_inc(v_fst_1077_);
lean_dec(v_val_1076_);
v___y_1071_ = v_fst_1077_;
goto v___jp_1070_;
}
v___jp_1070_:
{
lean_object* v___x_1072_; lean_object* v___x_1073_; 
v___x_1072_ = lean_nat_mul(v___y_1071_, v_maxItems_1066_);
lean_dec(v_maxItems_1066_);
lean_dec(v___y_1071_);
v___x_1073_ = lean_nat_add(v___x_1069_, v___x_1072_);
lean_dec(v___x_1072_);
lean_dec(v___x_1069_);
return v___x_1073_;
}
}
default: 
{
lean_object* v___x_1078_; 
lean_dec_ref(v_x_1015_);
lean_dec_ref(v_resolve_1014_);
v___x_1078_ = lean_unsigned_to_nat(0u);
return v___x_1078_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_callsItems(lean_object* v_resolve_1079_, lean_object* v_x_1080_){
_start:
{
if (lean_obj_tag(v_x_1080_) == 0)
{
lean_object* v___x_1081_; 
lean_dec_ref(v_resolve_1079_);
v___x_1081_ = lean_unsigned_to_nat(0u);
return v___x_1081_;
}
else
{
lean_object* v_head_1082_; lean_object* v_tail_1083_; lean_object* v___x_1084_; lean_object* v___x_1085_; lean_object* v___x_1086_; 
v_head_1082_ = lean_ctor_get(v_x_1080_, 0);
lean_inc(v_head_1082_);
v_tail_1083_ = lean_ctor_get(v_x_1080_, 1);
lean_inc(v_tail_1083_);
lean_dec_ref_known(v_x_1080_, 2);
lean_inc_ref(v_resolve_1079_);
v___x_1084_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1079_, v_head_1082_);
v___x_1085_ = lp_algalVerification_Algal_Source_callsItems(v_resolve_1079_, v_tail_1083_);
v___x_1086_ = lean_nat_add(v___x_1084_, v___x_1085_);
lean_dec(v___x_1085_);
lean_dec(v___x_1084_);
return v___x_1086_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthEntries(lean_object* v_resolve_1087_, uint8_t v_control_1088_, lean_object* v_x_1089_){
_start:
{
if (lean_obj_tag(v_x_1089_) == 0)
{
lean_object* v___x_1090_; 
lean_dec_ref(v_resolve_1087_);
v___x_1090_ = lean_unsigned_to_nat(0u);
return v___x_1090_;
}
else
{
lean_object* v_head_1091_; lean_object* v_tail_1092_; lean_object* v_snd_1093_; lean_object* v___x_1094_; lean_object* v___x_1095_; uint8_t v___x_1096_; 
v_head_1091_ = lean_ctor_get(v_x_1089_, 0);
lean_inc(v_head_1091_);
v_tail_1092_ = lean_ctor_get(v_x_1089_, 1);
lean_inc(v_tail_1092_);
lean_dec_ref_known(v_x_1089_, 2);
v_snd_1093_ = lean_ctor_get(v_head_1091_, 1);
lean_inc(v_snd_1093_);
lean_dec(v_head_1091_);
lean_inc_ref(v_resolve_1087_);
v___x_1094_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1087_, v_control_1088_, v_snd_1093_);
v___x_1095_ = lp_algalVerification_Algal_Source_depthEntries(v_resolve_1087_, v_control_1088_, v_tail_1092_);
v___x_1096_ = lean_nat_dec_le(v___x_1094_, v___x_1095_);
if (v___x_1096_ == 0)
{
lean_dec(v___x_1095_);
return v___x_1094_;
}
else
{
lean_dec(v___x_1094_);
return v___x_1095_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthExpr(lean_object* v_resolve_1097_, uint8_t v_control_1098_, lean_object* v_x_1099_){
_start:
{
lean_object* v___y_1101_; lean_object* v___y_1102_; lean_object* v_v_1105_; lean_object* v_l_1106_; lean_object* v___y_1111_; lean_object* v___y_1112_; 
switch(lean_obj_tag(v_x_1099_))
{
case 2:
{
lean_object* v_value_1114_; 
v_value_1114_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_value_1114_);
lean_dec_ref_known(v_x_1099_, 2);
v_x_1099_ = v_value_1114_;
goto _start;
}
case 3:
{
lean_object* v_value_1116_; lean_object* v_label_1117_; 
v_value_1116_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_value_1116_);
v_label_1117_ = lean_ctor_get(v_x_1099_, 1);
lean_inc_ref(v_label_1117_);
lean_dec_ref_known(v_x_1099_, 2);
v_v_1105_ = v_value_1116_;
v_l_1106_ = v_label_1117_;
goto v___jp_1104_;
}
case 4:
{
lean_object* v_value_1118_; 
v_value_1118_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_value_1118_);
lean_dec_ref_known(v_x_1099_, 1);
v_x_1099_ = v_value_1118_;
goto _start;
}
case 5:
{
lean_object* v_left_1120_; lean_object* v_right_1121_; lean_object* v___x_1122_; lean_object* v___x_1123_; uint8_t v___x_1124_; 
v_left_1120_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_left_1120_);
v_right_1121_ = lean_ctor_get(v_x_1099_, 1);
lean_inc_ref(v_right_1121_);
lean_dec_ref_known(v_x_1099_, 2);
lean_inc_ref(v_resolve_1097_);
v___x_1122_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v_control_1098_, v_left_1120_);
v___x_1123_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v_control_1098_, v_right_1121_);
v___x_1124_ = lean_nat_dec_le(v___x_1122_, v___x_1123_);
if (v___x_1124_ == 0)
{
lean_dec(v___x_1123_);
return v___x_1122_;
}
else
{
lean_dec(v___x_1122_);
return v___x_1123_;
}
}
case 6:
{
lean_object* v_entries_1125_; lean_object* v___x_1126_; 
v_entries_1125_ = lean_ctor_get(v_x_1099_, 0);
lean_inc(v_entries_1125_);
lean_dec_ref_known(v_x_1099_, 1);
v___x_1126_ = lp_algalVerification_Algal_Source_depthEntries(v_resolve_1097_, v_control_1098_, v_entries_1125_);
return v___x_1126_;
}
case 7:
{
lean_object* v_items_1127_; lean_object* v___x_1128_; 
v_items_1127_ = lean_ctor_get(v_x_1099_, 0);
lean_inc(v_items_1127_);
lean_dec_ref_known(v_x_1099_, 1);
v___x_1128_ = lp_algalVerification_Algal_Source_depthItems(v_resolve_1097_, v_control_1098_, v_items_1127_);
return v___x_1128_;
}
case 8:
{
lean_object* v_condition_1129_; lean_object* v_yes_1130_; lean_object* v_no_1131_; uint8_t v___y_1133_; uint8_t v___y_1139_; uint8_t v___x_1141_; 
v_condition_1129_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_condition_1129_);
v_yes_1130_ = lean_ctor_get(v_x_1099_, 1);
lean_inc_ref(v_yes_1130_);
v_no_1131_ = lean_ctor_get(v_x_1099_, 2);
lean_inc_ref(v_no_1131_);
lean_dec_ref_known(v_x_1099_, 3);
v___x_1141_ = lp_algalVerification_Algal_Source_hasEffect(v_condition_1129_);
if (v___x_1141_ == 0)
{
uint8_t v___x_1142_; 
v___x_1142_ = lp_algalVerification_Algal_Source_hasEffect(v_yes_1130_);
v___y_1139_ = v___x_1142_;
goto v___jp_1138_;
}
else
{
v___y_1139_ = v___x_1141_;
goto v___jp_1138_;
}
v___jp_1132_:
{
lean_object* v___x_1134_; lean_object* v___x_1135_; lean_object* v___x_1136_; uint8_t v___x_1137_; 
lean_inc_ref_n(v_resolve_1097_, 2);
v___x_1134_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v_control_1098_, v_condition_1129_);
v___x_1135_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v___y_1133_, v_yes_1130_);
v___x_1136_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v___y_1133_, v_no_1131_);
v___x_1137_ = lean_nat_dec_le(v___x_1135_, v___x_1136_);
if (v___x_1137_ == 0)
{
lean_dec(v___x_1136_);
v___y_1111_ = v___x_1134_;
v___y_1112_ = v___x_1135_;
goto v___jp_1110_;
}
else
{
lean_dec(v___x_1135_);
v___y_1111_ = v___x_1134_;
v___y_1112_ = v___x_1136_;
goto v___jp_1110_;
}
}
v___jp_1138_:
{
if (v___y_1139_ == 0)
{
uint8_t v___x_1140_; 
v___x_1140_ = lp_algalVerification_Algal_Source_hasEffect(v_no_1131_);
v___y_1133_ = v___x_1140_;
goto v___jp_1132_;
}
else
{
v___y_1133_ = v___y_1139_;
goto v___jp_1132_;
}
}
}
case 9:
{
lean_object* v_value_1143_; lean_object* v_arms_1144_; uint8_t v___y_1146_; uint8_t v___x_1150_; 
v_value_1143_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_value_1143_);
v_arms_1144_ = lean_ctor_get(v_x_1099_, 1);
lean_inc(v_arms_1144_);
lean_dec_ref_known(v_x_1099_, 2);
v___x_1150_ = lp_algalVerification_Algal_Source_hasEffect(v_value_1143_);
if (v___x_1150_ == 0)
{
uint8_t v___x_1151_; 
v___x_1151_ = lp_algalVerification_Algal_Source_hasEffectEntries(v_arms_1144_);
v___y_1146_ = v___x_1151_;
goto v___jp_1145_;
}
else
{
v___y_1146_ = v___x_1150_;
goto v___jp_1145_;
}
v___jp_1145_:
{
lean_object* v___x_1147_; lean_object* v___x_1148_; uint8_t v___x_1149_; 
lean_inc_ref(v_resolve_1097_);
v___x_1147_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v_control_1098_, v_value_1143_);
v___x_1148_ = lp_algalVerification_Algal_Source_depthEntries(v_resolve_1097_, v___y_1146_, v_arms_1144_);
v___x_1149_ = lean_nat_dec_le(v___x_1147_, v___x_1148_);
if (v___x_1149_ == 0)
{
lean_dec(v___x_1148_);
return v___x_1147_;
}
else
{
lean_dec(v___x_1147_);
return v___x_1148_;
}
}
}
case 10:
{
lean_object* v_context_1152_; 
v_context_1152_ = lean_ctor_get(v_x_1099_, 1);
lean_inc_ref(v_context_1152_);
lean_dec_ref_known(v_x_1099_, 3);
v_x_1099_ = v_context_1152_;
goto _start;
}
case 11:
{
lean_object* v_instruction_1154_; lean_object* v_context_1155_; 
v_instruction_1154_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_instruction_1154_);
v_context_1155_ = lean_ctor_get(v_x_1099_, 1);
lean_inc_ref(v_context_1155_);
lean_dec_ref_known(v_x_1099_, 2);
v_v_1105_ = v_instruction_1154_;
v_l_1106_ = v_context_1155_;
goto v___jp_1104_;
}
case 12:
{
lean_object* v_alias_1156_; lean_object* v_args_1157_; lean_object* v___y_1159_; lean_object* v___y_1160_; lean_object* v___y_1165_; lean_object* v___y_1168_; lean_object* v___x_1172_; 
v_alias_1156_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_alias_1156_);
v_args_1157_ = lean_ctor_get(v_x_1099_, 1);
lean_inc(v_args_1157_);
lean_dec_ref_known(v_x_1099_, 2);
lean_inc_ref(v_resolve_1097_);
v___x_1172_ = lean_apply_1(v_resolve_1097_, v_alias_1156_);
if (lean_obj_tag(v___x_1172_) == 0)
{
lean_object* v___x_1173_; 
v___x_1173_ = lean_unsigned_to_nat(0u);
v___y_1168_ = v___x_1173_;
goto v___jp_1167_;
}
else
{
lean_object* v_val_1174_; lean_object* v_snd_1175_; 
v_val_1174_ = lean_ctor_get(v___x_1172_, 0);
lean_inc(v_val_1174_);
lean_dec_ref_known(v___x_1172_, 1);
v_snd_1175_ = lean_ctor_get(v_val_1174_, 1);
lean_inc(v_snd_1175_);
lean_dec(v_val_1174_);
v___y_1168_ = v_snd_1175_;
goto v___jp_1167_;
}
v___jp_1158_:
{
lean_object* v_edge_1161_; lean_object* v___x_1162_; uint8_t v___x_1163_; 
v_edge_1161_ = lean_nat_add(v___y_1159_, v___y_1160_);
lean_dec(v___y_1159_);
v___x_1162_ = lp_algalVerification_Algal_Source_depthEntries(v_resolve_1097_, v_control_1098_, v_args_1157_);
v___x_1163_ = lean_nat_dec_le(v_edge_1161_, v___x_1162_);
if (v___x_1163_ == 0)
{
lean_dec(v___x_1162_);
return v_edge_1161_;
}
else
{
lean_dec(v_edge_1161_);
return v___x_1162_;
}
}
v___jp_1164_:
{
lean_object* v___x_1166_; 
v___x_1166_ = lean_unsigned_to_nat(0u);
v___y_1159_ = v___y_1165_;
v___y_1160_ = v___x_1166_;
goto v___jp_1158_;
}
v___jp_1167_:
{
lean_object* v___x_1169_; lean_object* v___x_1170_; 
v___x_1169_ = lean_unsigned_to_nat(1u);
v___x_1170_ = lean_nat_add(v___y_1168_, v___x_1169_);
lean_dec(v___y_1168_);
if (v_control_1098_ == 0)
{
v___y_1165_ = v___x_1170_;
goto v___jp_1164_;
}
else
{
uint8_t v___x_1171_; 
v___x_1171_ = l_List_isEmpty___redArg(v_args_1157_);
if (v___x_1171_ == 0)
{
v___y_1165_ = v___x_1170_;
goto v___jp_1164_;
}
else
{
v___y_1159_ = v___x_1170_;
v___y_1160_ = v___x_1169_;
goto v___jp_1158_;
}
}
}
}
case 13:
{
lean_object* v_alias_1176_; lean_object* v_items_1177_; lean_object* v_args_1178_; lean_object* v___y_1180_; lean_object* v___x_1186_; 
v_alias_1176_ = lean_ctor_get(v_x_1099_, 0);
lean_inc_ref(v_alias_1176_);
v_items_1177_ = lean_ctor_get(v_x_1099_, 2);
lean_inc_ref(v_items_1177_);
v_args_1178_ = lean_ctor_get(v_x_1099_, 3);
lean_inc(v_args_1178_);
lean_dec_ref_known(v_x_1099_, 5);
lean_inc_ref(v_resolve_1097_);
v___x_1186_ = lean_apply_1(v_resolve_1097_, v_alias_1176_);
if (lean_obj_tag(v___x_1186_) == 0)
{
lean_object* v___x_1187_; 
v___x_1187_ = lean_unsigned_to_nat(0u);
v___y_1180_ = v___x_1187_;
goto v___jp_1179_;
}
else
{
lean_object* v_val_1188_; lean_object* v_snd_1189_; 
v_val_1188_ = lean_ctor_get(v___x_1186_, 0);
lean_inc(v_val_1188_);
lean_dec_ref_known(v___x_1186_, 1);
v_snd_1189_ = lean_ctor_get(v_val_1188_, 1);
lean_inc(v_snd_1189_);
lean_dec(v_val_1188_);
v___y_1180_ = v_snd_1189_;
goto v___jp_1179_;
}
v___jp_1179_:
{
lean_object* v___x_1181_; lean_object* v___x_1182_; lean_object* v___x_1183_; lean_object* v___x_1184_; uint8_t v___x_1185_; 
v___x_1181_ = lean_unsigned_to_nat(1u);
v___x_1182_ = lean_nat_add(v___y_1180_, v___x_1181_);
lean_dec(v___y_1180_);
lean_inc_ref(v_resolve_1097_);
v___x_1183_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v_control_1098_, v_items_1177_);
v___x_1184_ = lp_algalVerification_Algal_Source_depthEntries(v_resolve_1097_, v_control_1098_, v_args_1178_);
v___x_1185_ = lean_nat_dec_le(v___x_1183_, v___x_1184_);
if (v___x_1185_ == 0)
{
lean_dec(v___x_1184_);
v___y_1101_ = v___x_1182_;
v___y_1102_ = v___x_1183_;
goto v___jp_1100_;
}
else
{
lean_dec(v___x_1183_);
v___y_1101_ = v___x_1182_;
v___y_1102_ = v___x_1184_;
goto v___jp_1100_;
}
}
}
default: 
{
lean_object* v___x_1190_; 
lean_dec_ref(v_x_1099_);
lean_dec_ref(v_resolve_1097_);
v___x_1190_ = lean_unsigned_to_nat(0u);
return v___x_1190_;
}
}
v___jp_1100_:
{
uint8_t v___x_1103_; 
v___x_1103_ = lean_nat_dec_le(v___y_1101_, v___y_1102_);
if (v___x_1103_ == 0)
{
lean_dec(v___y_1102_);
return v___y_1101_;
}
else
{
lean_dec(v___y_1101_);
return v___y_1102_;
}
}
v___jp_1104_:
{
lean_object* v___x_1107_; lean_object* v___x_1108_; uint8_t v___x_1109_; 
lean_inc_ref(v_resolve_1097_);
v___x_1107_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v_control_1098_, v_v_1105_);
v___x_1108_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1097_, v_control_1098_, v_l_1106_);
v___x_1109_ = lean_nat_dec_le(v___x_1107_, v___x_1108_);
if (v___x_1109_ == 0)
{
lean_dec(v___x_1108_);
return v___x_1107_;
}
else
{
lean_dec(v___x_1107_);
return v___x_1108_;
}
}
v___jp_1110_:
{
uint8_t v___x_1113_; 
v___x_1113_ = lean_nat_dec_le(v___y_1111_, v___y_1112_);
if (v___x_1113_ == 0)
{
lean_dec(v___y_1112_);
return v___y_1111_;
}
else
{
lean_dec(v___y_1111_);
return v___y_1112_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthItems(lean_object* v_resolve_1191_, uint8_t v_control_1192_, lean_object* v_x_1193_){
_start:
{
if (lean_obj_tag(v_x_1193_) == 0)
{
lean_object* v___x_1194_; 
lean_dec_ref(v_resolve_1191_);
v___x_1194_ = lean_unsigned_to_nat(0u);
return v___x_1194_;
}
else
{
lean_object* v_head_1195_; lean_object* v_tail_1196_; lean_object* v___x_1197_; lean_object* v___x_1198_; uint8_t v___x_1199_; 
v_head_1195_ = lean_ctor_get(v_x_1193_, 0);
lean_inc(v_head_1195_);
v_tail_1196_ = lean_ctor_get(v_x_1193_, 1);
lean_inc(v_tail_1196_);
lean_dec_ref_known(v_x_1193_, 2);
lean_inc_ref(v_resolve_1191_);
v___x_1197_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1191_, v_control_1192_, v_head_1195_);
v___x_1198_ = lp_algalVerification_Algal_Source_depthItems(v_resolve_1191_, v_control_1192_, v_tail_1196_);
v___x_1199_ = lean_nat_dec_le(v___x_1197_, v___x_1198_);
if (v___x_1199_ == 0)
{
lean_dec(v___x_1198_);
return v___x_1197_;
}
else
{
lean_dec(v___x_1197_);
return v___x_1198_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthItems___boxed(lean_object* v_resolve_1200_, lean_object* v_control_1201_, lean_object* v_x_1202_){
_start:
{
uint8_t v_control_boxed_1203_; lean_object* v_res_1204_; 
v_control_boxed_1203_ = lean_unbox(v_control_1201_);
v_res_1204_ = lp_algalVerification_Algal_Source_depthItems(v_resolve_1200_, v_control_boxed_1203_, v_x_1202_);
return v_res_1204_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthEntries___boxed(lean_object* v_resolve_1205_, lean_object* v_control_1206_, lean_object* v_x_1207_){
_start:
{
uint8_t v_control_boxed_1208_; lean_object* v_res_1209_; 
v_control_boxed_1208_ = lean_unbox(v_control_1206_);
v_res_1209_ = lp_algalVerification_Algal_Source_depthEntries(v_resolve_1205_, v_control_boxed_1208_, v_x_1207_);
return v_res_1209_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_depthExpr___boxed(lean_object* v_resolve_1210_, lean_object* v_control_1211_, lean_object* v_x_1212_){
_start:
{
uint8_t v_control_boxed_1213_; lean_object* v_res_1214_; 
v_control_boxed_1213_ = lean_unbox(v_control_1211_);
v_res_1214_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1210_, v_control_boxed_1213_, v_x_1212_);
return v_res_1214_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_Array_Basic_0__Array_foldrMUnsafe_fold___at___00List_foldrTR___at___00Algal_Source_analysisProgram_spec__3_spec__4(lean_object* v_as_1215_, size_t v_i_1216_, size_t v_stop_1217_, lean_object* v_b_1218_){
_start:
{
uint8_t v___x_1219_; 
v___x_1219_ = lean_usize_dec_eq(v_i_1216_, v_stop_1217_);
if (v___x_1219_ == 0)
{
size_t v___x_1220_; size_t v___x_1221_; lean_object* v___x_1222_; uint8_t v___x_1223_; 
v___x_1220_ = ((size_t)1ULL);
v___x_1221_ = lean_usize_sub(v_i_1216_, v___x_1220_);
v___x_1222_ = lean_array_uget_borrowed(v_as_1215_, v___x_1221_);
v___x_1223_ = lean_nat_dec_le(v___x_1222_, v_b_1218_);
if (v___x_1223_ == 0)
{
v_i_1216_ = v___x_1221_;
v_b_1218_ = v___x_1222_;
goto _start;
}
else
{
v_i_1216_ = v___x_1221_;
goto _start;
}
}
else
{
lean_inc(v_b_1218_);
return v_b_1218_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_Array_Basic_0__Array_foldrMUnsafe_fold___at___00List_foldrTR___at___00Algal_Source_analysisProgram_spec__3_spec__4___boxed(lean_object* v_as_1226_, lean_object* v_i_1227_, lean_object* v_stop_1228_, lean_object* v_b_1229_){
_start:
{
size_t v_i_boxed_1230_; size_t v_stop_boxed_1231_; lean_object* v_res_1232_; 
v_i_boxed_1230_ = lean_unbox_usize(v_i_1227_);
lean_dec(v_i_1227_);
v_stop_boxed_1231_ = lean_unbox_usize(v_stop_1228_);
lean_dec(v_stop_1228_);
v_res_1232_ = lp_algalVerification___private_Init_Data_Array_Basic_0__Array_foldrMUnsafe_fold___at___00List_foldrTR___at___00Algal_Source_analysisProgram_spec__3_spec__4(v_as_1226_, v_i_boxed_1230_, v_stop_boxed_1231_, v_b_1229_);
lean_dec(v_b_1229_);
lean_dec_ref(v_as_1226_);
return v_res_1232_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldrTR___at___00Algal_Source_analysisProgram_spec__3(lean_object* v_init_1233_, lean_object* v_l_1234_){
_start:
{
lean_object* v___x_1235_; lean_object* v___x_1236_; lean_object* v___x_1237_; uint8_t v___x_1238_; 
v___x_1235_ = lean_array_mk(v_l_1234_);
v___x_1236_ = lean_array_get_size(v___x_1235_);
v___x_1237_ = lean_unsigned_to_nat(0u);
v___x_1238_ = lean_nat_dec_lt(v___x_1237_, v___x_1236_);
if (v___x_1238_ == 0)
{
lean_dec_ref(v___x_1235_);
lean_inc(v_init_1233_);
return v_init_1233_;
}
else
{
size_t v___x_1239_; size_t v___x_1240_; lean_object* v___x_1241_; 
v___x_1239_ = lean_usize_of_nat(v___x_1236_);
v___x_1240_ = ((size_t)0ULL);
v___x_1241_ = lp_algalVerification___private_Init_Data_Array_Basic_0__Array_foldrMUnsafe_fold___at___00List_foldrTR___at___00Algal_Source_analysisProgram_spec__3_spec__4(v___x_1235_, v___x_1239_, v___x_1240_, v_init_1233_);
lean_dec_ref(v___x_1235_);
return v___x_1241_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldrTR___at___00Algal_Source_analysisProgram_spec__3___boxed(lean_object* v_init_1242_, lean_object* v_l_1243_){
_start:
{
lean_object* v_res_1244_; 
v_res_1244_ = lp_algalVerification_List_foldrTR___at___00Algal_Source_analysisProgram_spec__3(v_init_1242_, v_l_1243_);
lean_dec(v_init_1242_);
return v_res_1244_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_analysisProgram_spec__0(lean_object* v_resolve_1245_, lean_object* v_a_1246_, lean_object* v_a_1247_){
_start:
{
if (lean_obj_tag(v_a_1246_) == 0)
{
lean_object* v___x_1248_; 
lean_dec_ref(v_resolve_1245_);
v___x_1248_ = l_List_reverse___redArg(v_a_1247_);
return v___x_1248_;
}
else
{
lean_object* v_head_1249_; lean_object* v_tail_1250_; lean_object* v___x_1252_; uint8_t v_isShared_1253_; uint8_t v_isSharedCheck_1260_; 
v_head_1249_ = lean_ctor_get(v_a_1246_, 0);
v_tail_1250_ = lean_ctor_get(v_a_1246_, 1);
v_isSharedCheck_1260_ = !lean_is_exclusive(v_a_1246_);
if (v_isSharedCheck_1260_ == 0)
{
v___x_1252_ = v_a_1246_;
v_isShared_1253_ = v_isSharedCheck_1260_;
goto v_resetjp_1251_;
}
else
{
lean_inc(v_tail_1250_);
lean_inc(v_head_1249_);
lean_dec(v_a_1246_);
v___x_1252_ = lean_box(0);
v_isShared_1253_ = v_isSharedCheck_1260_;
goto v_resetjp_1251_;
}
v_resetjp_1251_:
{
lean_object* v_snd_1254_; lean_object* v___x_1255_; lean_object* v___x_1257_; 
v_snd_1254_ = lean_ctor_get(v_head_1249_, 1);
lean_inc(v_snd_1254_);
lean_dec(v_head_1249_);
lean_inc_ref(v_resolve_1245_);
v___x_1255_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1245_, v_snd_1254_);
if (v_isShared_1253_ == 0)
{
lean_ctor_set(v___x_1252_, 1, v_a_1247_);
lean_ctor_set(v___x_1252_, 0, v___x_1255_);
v___x_1257_ = v___x_1252_;
goto v_reusejp_1256_;
}
else
{
lean_object* v_reuseFailAlloc_1259_; 
v_reuseFailAlloc_1259_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1259_, 0, v___x_1255_);
lean_ctor_set(v_reuseFailAlloc_1259_, 1, v_a_1247_);
v___x_1257_ = v_reuseFailAlloc_1259_;
goto v_reusejp_1256_;
}
v_reusejp_1256_:
{
v_a_1246_ = v_tail_1250_;
v_a_1247_ = v___x_1257_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Source_analysisProgram_spec__2(lean_object* v_resolve_1261_, lean_object* v_a_1262_, lean_object* v_a_1263_){
_start:
{
if (lean_obj_tag(v_a_1262_) == 0)
{
lean_object* v___x_1264_; 
lean_dec_ref(v_resolve_1261_);
v___x_1264_ = l_List_reverse___redArg(v_a_1263_);
return v___x_1264_;
}
else
{
lean_object* v_head_1265_; lean_object* v_tail_1266_; lean_object* v___x_1268_; uint8_t v_isShared_1269_; uint8_t v_isSharedCheck_1277_; 
v_head_1265_ = lean_ctor_get(v_a_1262_, 0);
v_tail_1266_ = lean_ctor_get(v_a_1262_, 1);
v_isSharedCheck_1277_ = !lean_is_exclusive(v_a_1262_);
if (v_isSharedCheck_1277_ == 0)
{
v___x_1268_ = v_a_1262_;
v_isShared_1269_ = v_isSharedCheck_1277_;
goto v_resetjp_1267_;
}
else
{
lean_inc(v_tail_1266_);
lean_inc(v_head_1265_);
lean_dec(v_a_1262_);
v___x_1268_ = lean_box(0);
v_isShared_1269_ = v_isSharedCheck_1277_;
goto v_resetjp_1267_;
}
v_resetjp_1267_:
{
lean_object* v_snd_1270_; uint8_t v___x_1271_; lean_object* v___x_1272_; lean_object* v___x_1274_; 
v_snd_1270_ = lean_ctor_get(v_head_1265_, 1);
lean_inc(v_snd_1270_);
lean_dec(v_head_1265_);
v___x_1271_ = 0;
lean_inc_ref(v_resolve_1261_);
v___x_1272_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1261_, v___x_1271_, v_snd_1270_);
if (v_isShared_1269_ == 0)
{
lean_ctor_set(v___x_1268_, 1, v_a_1263_);
lean_ctor_set(v___x_1268_, 0, v___x_1272_);
v___x_1274_ = v___x_1268_;
goto v_reusejp_1273_;
}
else
{
lean_object* v_reuseFailAlloc_1276_; 
v_reuseFailAlloc_1276_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1276_, 0, v___x_1272_);
lean_ctor_set(v_reuseFailAlloc_1276_, 1, v_a_1263_);
v___x_1274_ = v_reuseFailAlloc_1276_;
goto v_reusejp_1273_;
}
v_reusejp_1273_:
{
v_a_1262_ = v_tail_1266_;
v_a_1263_ = v___x_1274_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldr___at___00List_sum___at___00Algal_Source_analysisProgram_spec__1_spec__1(lean_object* v_init_1278_, lean_object* v_x_1279_){
_start:
{
if (lean_obj_tag(v_x_1279_) == 0)
{
lean_inc(v_init_1278_);
return v_init_1278_;
}
else
{
lean_object* v_head_1280_; lean_object* v_tail_1281_; lean_object* v___x_1282_; lean_object* v___x_1283_; 
v_head_1280_ = lean_ctor_get(v_x_1279_, 0);
v_tail_1281_ = lean_ctor_get(v_x_1279_, 1);
v___x_1282_ = lp_algalVerification_List_foldr___at___00List_sum___at___00Algal_Source_analysisProgram_spec__1_spec__1(v_init_1278_, v_tail_1281_);
v___x_1283_ = lean_nat_add(v_head_1280_, v___x_1282_);
lean_dec(v___x_1282_);
return v___x_1283_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldr___at___00List_sum___at___00Algal_Source_analysisProgram_spec__1_spec__1___boxed(lean_object* v_init_1284_, lean_object* v_x_1285_){
_start:
{
lean_object* v_res_1286_; 
v_res_1286_ = lp_algalVerification_List_foldr___at___00List_sum___at___00Algal_Source_analysisProgram_spec__1_spec__1(v_init_1284_, v_x_1285_);
lean_dec(v_x_1285_);
lean_dec(v_init_1284_);
return v_res_1286_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_sum___at___00Algal_Source_analysisProgram_spec__1(lean_object* v_l_1287_){
_start:
{
lean_object* v___x_1288_; lean_object* v___x_1289_; 
v___x_1288_ = lean_unsigned_to_nat(0u);
v___x_1289_ = lp_algalVerification_List_foldr___at___00List_sum___at___00Algal_Source_analysisProgram_spec__1_spec__1(v___x_1288_, v_l_1287_);
return v___x_1289_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_sum___at___00Algal_Source_analysisProgram_spec__1___boxed(lean_object* v_l_1290_){
_start:
{
lean_object* v_res_1291_; 
v_res_1291_ = lp_algalVerification_List_sum___at___00Algal_Source_analysisProgram_spec__1(v_l_1290_);
lean_dec(v_l_1290_);
return v_res_1291_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisProgram(lean_object* v_resolve_1292_, lean_object* v_p_1293_){
_start:
{
lean_object* v_bindings_1294_; lean_object* v_result_1295_; lean_object* v___x_1296_; lean_object* v___x_1297_; lean_object* v___x_1298_; lean_object* v___x_1299_; lean_object* v___x_1300_; lean_object* v_calls_1301_; uint8_t v___x_1302_; lean_object* v___x_1303_; lean_object* v___x_1304_; lean_object* v___x_1305_; uint8_t v___x_1306_; 
v_bindings_1294_ = lean_ctor_get(v_p_1293_, 2);
lean_inc_n(v_bindings_1294_, 2);
v_result_1295_ = lean_ctor_get(v_p_1293_, 3);
lean_inc_ref_n(v_result_1295_, 2);
lean_dec_ref(v_p_1293_);
v___x_1296_ = lean_unsigned_to_nat(0u);
v___x_1297_ = lean_box(0);
lean_inc_ref_n(v_resolve_1292_, 3);
v___x_1298_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_analysisProgram_spec__0(v_resolve_1292_, v_bindings_1294_, v___x_1297_);
v___x_1299_ = lp_algalVerification_List_sum___at___00Algal_Source_analysisProgram_spec__1(v___x_1298_);
lean_dec(v___x_1298_);
v___x_1300_ = lp_algalVerification_Algal_Source_callsExpr(v_resolve_1292_, v_result_1295_);
v_calls_1301_ = lean_nat_add(v___x_1299_, v___x_1300_);
lean_dec(v___x_1300_);
lean_dec(v___x_1299_);
v___x_1302_ = 0;
v___x_1303_ = lp_algalVerification_Algal_Source_depthExpr(v_resolve_1292_, v___x_1302_, v_result_1295_);
v___x_1304_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Source_analysisProgram_spec__2(v_resolve_1292_, v_bindings_1294_, v___x_1297_);
v___x_1305_ = lp_algalVerification_List_foldrTR___at___00Algal_Source_analysisProgram_spec__3(v___x_1296_, v___x_1304_);
v___x_1306_ = lean_nat_dec_le(v___x_1303_, v___x_1305_);
if (v___x_1306_ == 0)
{
lean_object* v___x_1307_; 
lean_dec(v___x_1305_);
v___x_1307_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1307_, 0, v_calls_1301_);
lean_ctor_set(v___x_1307_, 1, v___x_1303_);
return v___x_1307_;
}
else
{
lean_object* v___x_1308_; 
lean_dec(v___x_1303_);
v___x_1308_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1308_, 0, v_calls_1301_);
lean_ctor_set(v___x_1308_, 1, v___x_1305_);
return v___x_1308_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(lean_object* v_x_1309_, lean_object* v_x_1310_){
_start:
{
if (lean_obj_tag(v_x_1310_) == 0)
{
lean_object* v___x_1311_; 
v___x_1311_ = lean_box(0);
return v___x_1311_;
}
else
{
lean_object* v_head_1312_; lean_object* v_tail_1313_; lean_object* v_fst_1314_; lean_object* v_snd_1315_; uint8_t v___x_1316_; 
v_head_1312_ = lean_ctor_get(v_x_1310_, 0);
v_tail_1313_ = lean_ctor_get(v_x_1310_, 1);
v_fst_1314_ = lean_ctor_get(v_head_1312_, 0);
v_snd_1315_ = lean_ctor_get(v_head_1312_, 1);
v___x_1316_ = lean_string_dec_eq(v_x_1309_, v_fst_1314_);
if (v___x_1316_ == 0)
{
v_x_1310_ = v_tail_1313_;
goto _start;
}
else
{
lean_object* v___x_1318_; 
lean_inc(v_snd_1315_);
v___x_1318_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_1318_, 0, v_snd_1315_);
return v___x_1318_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg___boxed(lean_object* v_x_1319_, lean_object* v_x_1320_){
_start:
{
lean_object* v_res_1321_; 
v_res_1321_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_x_1319_, v_x_1320_);
lean_dec(v_x_1320_);
lean_dec_ref(v_x_1319_);
return v_res_1321_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisModule___lam__0___boxed(lean_object* v_imports_1322_, lean_object* v_alias_1323_){
_start:
{
lean_object* v_res_1324_; 
v_res_1324_ = lp_algalVerification_Algal_Source_analysisModule___lam__0(v_imports_1322_, v_alias_1323_);
lean_dec_ref(v_alias_1323_);
return v_res_1324_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisModule(lean_object* v_x_1325_){
_start:
{
lean_object* v_program_1326_; lean_object* v_imports_1327_; lean_object* v___f_1328_; lean_object* v___x_1329_; 
v_program_1326_ = lean_ctor_get(v_x_1325_, 1);
lean_inc_ref(v_program_1326_);
v_imports_1327_ = lean_ctor_get(v_x_1325_, 2);
lean_inc(v_imports_1327_);
lean_dec_ref(v_x_1325_);
v___f_1328_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Source_analysisModule___lam__0___boxed), 2, 1);
lean_closure_set(v___f_1328_, 0, v_imports_1327_);
v___x_1329_ = lp_algalVerification_Algal_Source_analysisProgram(v___f_1328_, v_program_1326_);
return v___x_1329_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisImports(lean_object* v_x_1330_){
_start:
{
if (lean_obj_tag(v_x_1330_) == 0)
{
lean_object* v___x_1331_; 
v___x_1331_ = lean_box(0);
return v___x_1331_;
}
else
{
lean_object* v_head_1332_; lean_object* v_tail_1333_; lean_object* v___x_1335_; uint8_t v_isShared_1336_; uint8_t v_isSharedCheck_1351_; 
v_head_1332_ = lean_ctor_get(v_x_1330_, 0);
v_tail_1333_ = lean_ctor_get(v_x_1330_, 1);
v_isSharedCheck_1351_ = !lean_is_exclusive(v_x_1330_);
if (v_isSharedCheck_1351_ == 0)
{
v___x_1335_ = v_x_1330_;
v_isShared_1336_ = v_isSharedCheck_1351_;
goto v_resetjp_1334_;
}
else
{
lean_inc(v_tail_1333_);
lean_inc(v_head_1332_);
lean_dec(v_x_1330_);
v___x_1335_ = lean_box(0);
v_isShared_1336_ = v_isSharedCheck_1351_;
goto v_resetjp_1334_;
}
v_resetjp_1334_:
{
lean_object* v_fst_1337_; lean_object* v_snd_1338_; lean_object* v___x_1340_; uint8_t v_isShared_1341_; uint8_t v_isSharedCheck_1350_; 
v_fst_1337_ = lean_ctor_get(v_head_1332_, 0);
v_snd_1338_ = lean_ctor_get(v_head_1332_, 1);
v_isSharedCheck_1350_ = !lean_is_exclusive(v_head_1332_);
if (v_isSharedCheck_1350_ == 0)
{
v___x_1340_ = v_head_1332_;
v_isShared_1341_ = v_isSharedCheck_1350_;
goto v_resetjp_1339_;
}
else
{
lean_inc(v_snd_1338_);
lean_inc(v_fst_1337_);
lean_dec(v_head_1332_);
v___x_1340_ = lean_box(0);
v_isShared_1341_ = v_isSharedCheck_1350_;
goto v_resetjp_1339_;
}
v_resetjp_1339_:
{
lean_object* v___x_1342_; lean_object* v___x_1344_; 
v___x_1342_ = lp_algalVerification_Algal_Source_analysisModule(v_snd_1338_);
if (v_isShared_1341_ == 0)
{
lean_ctor_set(v___x_1340_, 1, v___x_1342_);
v___x_1344_ = v___x_1340_;
goto v_reusejp_1343_;
}
else
{
lean_object* v_reuseFailAlloc_1349_; 
v_reuseFailAlloc_1349_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1349_, 0, v_fst_1337_);
lean_ctor_set(v_reuseFailAlloc_1349_, 1, v___x_1342_);
v___x_1344_ = v_reuseFailAlloc_1349_;
goto v_reusejp_1343_;
}
v_reusejp_1343_:
{
lean_object* v___x_1345_; lean_object* v___x_1347_; 
v___x_1345_ = lp_algalVerification_Algal_Source_analysisImports(v_tail_1333_);
if (v_isShared_1336_ == 0)
{
lean_ctor_set(v___x_1335_, 1, v___x_1345_);
lean_ctor_set(v___x_1335_, 0, v___x_1344_);
v___x_1347_ = v___x_1335_;
goto v_reusejp_1346_;
}
else
{
lean_object* v_reuseFailAlloc_1348_; 
v_reuseFailAlloc_1348_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_1348_, 0, v___x_1344_);
lean_ctor_set(v_reuseFailAlloc_1348_, 1, v___x_1345_);
v___x_1347_ = v_reuseFailAlloc_1348_;
goto v_reusejp_1346_;
}
v_reusejp_1346_:
{
return v___x_1347_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_analysisModule___lam__0(lean_object* v_imports_1352_, lean_object* v_alias_1353_){
_start:
{
lean_object* v___x_1354_; lean_object* v___x_1355_; 
v___x_1354_ = lp_algalVerification_Algal_Source_analysisImports(v_imports_1352_);
v___x_1355_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_alias_1353_, v___x_1354_);
lean_dec(v___x_1354_);
return v___x_1355_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0(lean_object* v_00_u03b2_1356_, lean_object* v_x_1357_, lean_object* v_x_1358_){
_start:
{
lean_object* v___x_1359_; 
v___x_1359_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___redArg(v_x_1357_, v_x_1358_);
return v___x_1359_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0___boxed(lean_object* v_00_u03b2_1360_, lean_object* v_x_1361_, lean_object* v_x_1362_){
_start:
{
lean_object* v_res_1363_; 
v_res_1363_ = lp_algalVerification_List_lookup___at___00Algal_Source_analysisModule_spec__0(v_00_u03b2_1360_, v_x_1361_, v_x_1362_);
lean_dec(v_x_1362_);
lean_dec_ref(v_x_1361_);
return v_res_1363_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorIdx(uint8_t v_x_1364_){
_start:
{
switch(v_x_1364_)
{
case 0:
{
lean_object* v___x_1365_; 
v___x_1365_ = lean_unsigned_to_nat(0u);
return v___x_1365_;
}
case 1:
{
lean_object* v___x_1366_; 
v___x_1366_ = lean_unsigned_to_nat(1u);
return v___x_1366_;
}
case 2:
{
lean_object* v___x_1367_; 
v___x_1367_ = lean_unsigned_to_nat(2u);
return v___x_1367_;
}
case 3:
{
lean_object* v___x_1368_; 
v___x_1368_ = lean_unsigned_to_nat(3u);
return v___x_1368_;
}
case 4:
{
lean_object* v___x_1369_; 
v___x_1369_ = lean_unsigned_to_nat(4u);
return v___x_1369_;
}
default: 
{
lean_object* v___x_1370_; 
v___x_1370_ = lean_unsigned_to_nat(5u);
return v___x_1370_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorIdx___boxed(lean_object* v_x_1371_){
_start:
{
uint8_t v_x_boxed_1372_; lean_object* v_res_1373_; 
v_x_boxed_1372_ = lean_unbox(v_x_1371_);
v_res_1373_ = lp_algalVerification_Algal_Source_CellKind_ctorIdx(v_x_boxed_1372_);
return v_res_1373_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim___redArg(lean_object* v_k_1374_){
_start:
{
lean_inc(v_k_1374_);
return v_k_1374_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim___redArg___boxed(lean_object* v_k_1375_){
_start:
{
lean_object* v_res_1376_; 
v_res_1376_ = lp_algalVerification_Algal_Source_CellKind_ctorElim___redArg(v_k_1375_);
lean_dec(v_k_1375_);
return v_res_1376_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim(lean_object* v_motive_1377_, lean_object* v_ctorIdx_1378_, uint8_t v_t_1379_, lean_object* v_h_1380_, lean_object* v_k_1381_){
_start:
{
lean_inc(v_k_1381_);
return v_k_1381_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ctorElim___boxed(lean_object* v_motive_1382_, lean_object* v_ctorIdx_1383_, lean_object* v_t_1384_, lean_object* v_h_1385_, lean_object* v_k_1386_){
_start:
{
uint8_t v_t_boxed_1387_; lean_object* v_res_1388_; 
v_t_boxed_1387_ = lean_unbox(v_t_1384_);
v_res_1388_ = lp_algalVerification_Algal_Source_CellKind_ctorElim(v_motive_1382_, v_ctorIdx_1383_, v_t_boxed_1387_, v_h_1385_, v_k_1386_);
lean_dec(v_k_1386_);
lean_dec(v_ctorIdx_1383_);
return v_res_1388_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim___redArg(lean_object* v_input_1389_){
_start:
{
lean_inc(v_input_1389_);
return v_input_1389_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim___redArg___boxed(lean_object* v_input_1390_){
_start:
{
lean_object* v_res_1391_; 
v_res_1391_ = lp_algalVerification_Algal_Source_CellKind_input_elim___redArg(v_input_1390_);
lean_dec(v_input_1390_);
return v_res_1391_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim(lean_object* v_motive_1392_, uint8_t v_t_1393_, lean_object* v_h_1394_, lean_object* v_input_1395_){
_start:
{
lean_inc(v_input_1395_);
return v_input_1395_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_input_elim___boxed(lean_object* v_motive_1396_, lean_object* v_t_1397_, lean_object* v_h_1398_, lean_object* v_input_1399_){
_start:
{
uint8_t v_t_boxed_1400_; lean_object* v_res_1401_; 
v_t_boxed_1400_ = lean_unbox(v_t_1397_);
v_res_1401_ = lp_algalVerification_Algal_Source_CellKind_input_elim(v_motive_1396_, v_t_boxed_1400_, v_h_1398_, v_input_1399_);
lean_dec(v_input_1399_);
return v_res_1401_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim___redArg(lean_object* v_expr_1402_){
_start:
{
lean_inc(v_expr_1402_);
return v_expr_1402_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim___redArg___boxed(lean_object* v_expr_1403_){
_start:
{
lean_object* v_res_1404_; 
v_res_1404_ = lp_algalVerification_Algal_Source_CellKind_expr_elim___redArg(v_expr_1403_);
lean_dec(v_expr_1403_);
return v_res_1404_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim(lean_object* v_motive_1405_, uint8_t v_t_1406_, lean_object* v_h_1407_, lean_object* v_expr_1408_){
_start:
{
lean_inc(v_expr_1408_);
return v_expr_1408_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_expr_elim___boxed(lean_object* v_motive_1409_, lean_object* v_t_1410_, lean_object* v_h_1411_, lean_object* v_expr_1412_){
_start:
{
uint8_t v_t_boxed_1413_; lean_object* v_res_1414_; 
v_t_boxed_1413_ = lean_unbox(v_t_1410_);
v_res_1414_ = lp_algalVerification_Algal_Source_CellKind_expr_elim(v_motive_1409_, v_t_boxed_1413_, v_h_1411_, v_expr_1412_);
lean_dec(v_expr_1412_);
return v_res_1414_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim___redArg(lean_object* v_decide_1415_){
_start:
{
lean_inc(v_decide_1415_);
return v_decide_1415_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim___redArg___boxed(lean_object* v_decide_1416_){
_start:
{
lean_object* v_res_1417_; 
v_res_1417_ = lp_algalVerification_Algal_Source_CellKind_decide_elim___redArg(v_decide_1416_);
lean_dec(v_decide_1416_);
return v_res_1417_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim(lean_object* v_motive_1418_, uint8_t v_t_1419_, lean_object* v_h_1420_, lean_object* v_decide_1421_){
_start:
{
lean_inc(v_decide_1421_);
return v_decide_1421_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_decide_elim___boxed(lean_object* v_motive_1422_, lean_object* v_t_1423_, lean_object* v_h_1424_, lean_object* v_decide_1425_){
_start:
{
uint8_t v_t_boxed_1426_; lean_object* v_res_1427_; 
v_t_boxed_1426_ = lean_unbox(v_t_1423_);
v_res_1427_ = lp_algalVerification_Algal_Source_CellKind_decide_elim(v_motive_1422_, v_t_boxed_1426_, v_h_1424_, v_decide_1425_);
lean_dec(v_decide_1425_);
return v_res_1427_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim___redArg(lean_object* v_agent_1428_){
_start:
{
lean_inc(v_agent_1428_);
return v_agent_1428_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim___redArg___boxed(lean_object* v_agent_1429_){
_start:
{
lean_object* v_res_1430_; 
v_res_1430_ = lp_algalVerification_Algal_Source_CellKind_agent_elim___redArg(v_agent_1429_);
lean_dec(v_agent_1429_);
return v_res_1430_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim(lean_object* v_motive_1431_, uint8_t v_t_1432_, lean_object* v_h_1433_, lean_object* v_agent_1434_){
_start:
{
lean_inc(v_agent_1434_);
return v_agent_1434_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_agent_elim___boxed(lean_object* v_motive_1435_, lean_object* v_t_1436_, lean_object* v_h_1437_, lean_object* v_agent_1438_){
_start:
{
uint8_t v_t_boxed_1439_; lean_object* v_res_1440_; 
v_t_boxed_1439_ = lean_unbox(v_t_1436_);
v_res_1440_ = lp_algalVerification_Algal_Source_CellKind_agent_elim(v_motive_1435_, v_t_boxed_1439_, v_h_1437_, v_agent_1438_);
lean_dec(v_agent_1438_);
return v_res_1440_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim___redArg(lean_object* v_organism_1441_){
_start:
{
lean_inc(v_organism_1441_);
return v_organism_1441_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim___redArg___boxed(lean_object* v_organism_1442_){
_start:
{
lean_object* v_res_1443_; 
v_res_1443_ = lp_algalVerification_Algal_Source_CellKind_organism_elim___redArg(v_organism_1442_);
lean_dec(v_organism_1442_);
return v_res_1443_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim(lean_object* v_motive_1444_, uint8_t v_t_1445_, lean_object* v_h_1446_, lean_object* v_organism_1447_){
_start:
{
lean_inc(v_organism_1447_);
return v_organism_1447_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_organism_elim___boxed(lean_object* v_motive_1448_, lean_object* v_t_1449_, lean_object* v_h_1450_, lean_object* v_organism_1451_){
_start:
{
uint8_t v_t_boxed_1452_; lean_object* v_res_1453_; 
v_t_boxed_1452_ = lean_unbox(v_t_1449_);
v_res_1453_ = lp_algalVerification_Algal_Source_CellKind_organism_elim(v_motive_1448_, v_t_boxed_1452_, v_h_1450_, v_organism_1451_);
lean_dec(v_organism_1451_);
return v_res_1453_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim___redArg(lean_object* v_each_1454_){
_start:
{
lean_inc(v_each_1454_);
return v_each_1454_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim___redArg___boxed(lean_object* v_each_1455_){
_start:
{
lean_object* v_res_1456_; 
v_res_1456_ = lp_algalVerification_Algal_Source_CellKind_each_elim___redArg(v_each_1455_);
lean_dec(v_each_1455_);
return v_res_1456_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim(lean_object* v_motive_1457_, uint8_t v_t_1458_, lean_object* v_h_1459_, lean_object* v_each_1460_){
_start:
{
lean_inc(v_each_1460_);
return v_each_1460_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_each_elim___boxed(lean_object* v_motive_1461_, lean_object* v_t_1462_, lean_object* v_h_1463_, lean_object* v_each_1464_){
_start:
{
uint8_t v_t_boxed_1465_; lean_object* v_res_1466_; 
v_t_boxed_1465_ = lean_unbox(v_t_1462_);
v_res_1466_ = lp_algalVerification_Algal_Source_CellKind_each_elim(v_motive_1461_, v_t_boxed_1465_, v_h_1463_, v_each_1464_);
lean_dec(v_each_1464_);
return v_res_1466_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_CellKind_ofNat(lean_object* v_n_1467_){
_start:
{
lean_object* v___x_1468_; uint8_t v___x_1469_; 
v___x_1468_ = lean_unsigned_to_nat(2u);
v___x_1469_ = lean_nat_dec_le(v_n_1467_, v___x_1468_);
if (v___x_1469_ == 0)
{
lean_object* v___x_1470_; uint8_t v___x_1471_; 
v___x_1470_ = lean_unsigned_to_nat(3u);
v___x_1471_ = lean_nat_dec_le(v_n_1467_, v___x_1470_);
if (v___x_1471_ == 0)
{
lean_object* v___x_1472_; uint8_t v___x_1473_; 
v___x_1472_ = lean_unsigned_to_nat(4u);
v___x_1473_ = lean_nat_dec_le(v_n_1467_, v___x_1472_);
if (v___x_1473_ == 0)
{
uint8_t v___x_1474_; 
v___x_1474_ = 5;
return v___x_1474_;
}
else
{
uint8_t v___x_1475_; 
v___x_1475_ = 4;
return v___x_1475_;
}
}
else
{
uint8_t v___x_1476_; 
v___x_1476_ = 3;
return v___x_1476_;
}
}
else
{
lean_object* v___x_1477_; uint8_t v___x_1478_; 
v___x_1477_ = lean_unsigned_to_nat(0u);
v___x_1478_ = lean_nat_dec_le(v_n_1467_, v___x_1477_);
if (v___x_1478_ == 0)
{
lean_object* v___x_1479_; uint8_t v___x_1480_; 
v___x_1479_ = lean_unsigned_to_nat(1u);
v___x_1480_ = lean_nat_dec_le(v_n_1467_, v___x_1479_);
if (v___x_1480_ == 0)
{
uint8_t v___x_1481_; 
v___x_1481_ = 2;
return v___x_1481_;
}
else
{
uint8_t v___x_1482_; 
v___x_1482_ = 1;
return v___x_1482_;
}
}
else
{
uint8_t v___x_1483_; 
v___x_1483_ = 0;
return v___x_1483_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_CellKind_ofNat___boxed(lean_object* v_n_1484_){
_start:
{
uint8_t v_res_1485_; lean_object* v_r_1486_; 
v_res_1485_ = lp_algalVerification_Algal_Source_CellKind_ofNat(v_n_1484_);
lean_dec(v_n_1484_);
v_r_1486_ = lean_box(v_res_1485_);
return v_r_1486_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Source_instDecidableEqCellKind(uint8_t v_x_1487_, uint8_t v_y_1488_){
_start:
{
lean_object* v___x_1489_; lean_object* v___x_1490_; uint8_t v___x_1491_; 
v___x_1489_ = lp_algalVerification_Algal_Source_CellKind_ctorIdx(v_x_1487_);
v___x_1490_ = lp_algalVerification_Algal_Source_CellKind_ctorIdx(v_y_1488_);
v___x_1491_ = lean_nat_dec_eq(v___x_1489_, v___x_1490_);
lean_dec(v___x_1490_);
lean_dec(v___x_1489_);
return v___x_1491_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instDecidableEqCellKind___boxed(lean_object* v_x_1492_, lean_object* v_y_1493_){
_start:
{
uint8_t v_x_13__boxed_1494_; uint8_t v_y_14__boxed_1495_; uint8_t v_res_1496_; lean_object* v_r_1497_; 
v_x_13__boxed_1494_ = lean_unbox(v_x_1492_);
v_y_14__boxed_1495_ = lean_unbox(v_y_1493_);
v_res_1496_ = lp_algalVerification_Algal_Source_instDecidableEqCellKind(v_x_13__boxed_1494_, v_y_14__boxed_1495_);
v_r_1497_ = lean_box(v_res_1496_);
return v_r_1497_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr(uint8_t v_x_1516_, lean_object* v_prec_1517_){
_start:
{
lean_object* v___y_1519_; lean_object* v___y_1526_; lean_object* v___y_1533_; lean_object* v___y_1540_; lean_object* v___y_1547_; lean_object* v___y_1554_; 
switch(v_x_1516_)
{
case 0:
{
lean_object* v___x_1560_; uint8_t v___x_1561_; 
v___x_1560_ = lean_unsigned_to_nat(1024u);
v___x_1561_ = lean_nat_dec_le(v___x_1560_, v_prec_1517_);
if (v___x_1561_ == 0)
{
lean_object* v___x_1562_; 
v___x_1562_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_1519_ = v___x_1562_;
goto v___jp_1518_;
}
else
{
lean_object* v___x_1563_; 
v___x_1563_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_1519_ = v___x_1563_;
goto v___jp_1518_;
}
}
case 1:
{
lean_object* v___x_1564_; uint8_t v___x_1565_; 
v___x_1564_ = lean_unsigned_to_nat(1024u);
v___x_1565_ = lean_nat_dec_le(v___x_1564_, v_prec_1517_);
if (v___x_1565_ == 0)
{
lean_object* v___x_1566_; 
v___x_1566_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_1526_ = v___x_1566_;
goto v___jp_1525_;
}
else
{
lean_object* v___x_1567_; 
v___x_1567_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_1526_ = v___x_1567_;
goto v___jp_1525_;
}
}
case 2:
{
lean_object* v___x_1568_; uint8_t v___x_1569_; 
v___x_1568_ = lean_unsigned_to_nat(1024u);
v___x_1569_ = lean_nat_dec_le(v___x_1568_, v_prec_1517_);
if (v___x_1569_ == 0)
{
lean_object* v___x_1570_; 
v___x_1570_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_1533_ = v___x_1570_;
goto v___jp_1532_;
}
else
{
lean_object* v___x_1571_; 
v___x_1571_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_1533_ = v___x_1571_;
goto v___jp_1532_;
}
}
case 3:
{
lean_object* v___x_1572_; uint8_t v___x_1573_; 
v___x_1572_ = lean_unsigned_to_nat(1024u);
v___x_1573_ = lean_nat_dec_le(v___x_1572_, v_prec_1517_);
if (v___x_1573_ == 0)
{
lean_object* v___x_1574_; 
v___x_1574_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_1540_ = v___x_1574_;
goto v___jp_1539_;
}
else
{
lean_object* v___x_1575_; 
v___x_1575_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_1540_ = v___x_1575_;
goto v___jp_1539_;
}
}
case 4:
{
lean_object* v___x_1576_; uint8_t v___x_1577_; 
v___x_1576_ = lean_unsigned_to_nat(1024u);
v___x_1577_ = lean_nat_dec_le(v___x_1576_, v_prec_1517_);
if (v___x_1577_ == 0)
{
lean_object* v___x_1578_; 
v___x_1578_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_1547_ = v___x_1578_;
goto v___jp_1546_;
}
else
{
lean_object* v___x_1579_; 
v___x_1579_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_1547_ = v___x_1579_;
goto v___jp_1546_;
}
}
default: 
{
lean_object* v___x_1580_; uint8_t v___x_1581_; 
v___x_1580_ = lean_unsigned_to_nat(1024u);
v___x_1581_ = lean_nat_dec_le(v___x_1580_, v_prec_1517_);
if (v___x_1581_ == 0)
{
lean_object* v___x_1582_; 
v___x_1582_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__6, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__6_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__6);
v___y_1554_ = v___x_1582_;
goto v___jp_1553_;
}
else
{
lean_object* v___x_1583_; 
v___x_1583_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprPType_repr___closed__7, &lp_algalVerification_Algal_Source_instReprPType_repr___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprPType_repr___closed__7);
v___y_1554_ = v___x_1583_;
goto v___jp_1553_;
}
}
}
v___jp_1518_:
{
lean_object* v___x_1520_; lean_object* v___x_1521_; uint8_t v___x_1522_; lean_object* v___x_1523_; lean_object* v___x_1524_; 
v___x_1520_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__1));
lean_inc(v___y_1519_);
v___x_1521_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1521_, 0, v___y_1519_);
lean_ctor_set(v___x_1521_, 1, v___x_1520_);
v___x_1522_ = 0;
v___x_1523_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1523_, 0, v___x_1521_);
lean_ctor_set_uint8(v___x_1523_, sizeof(void*)*1, v___x_1522_);
v___x_1524_ = l_Repr_addAppParen(v___x_1523_, v_prec_1517_);
return v___x_1524_;
}
v___jp_1525_:
{
lean_object* v___x_1527_; lean_object* v___x_1528_; uint8_t v___x_1529_; lean_object* v___x_1530_; lean_object* v___x_1531_; 
v___x_1527_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__3));
lean_inc(v___y_1526_);
v___x_1528_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1528_, 0, v___y_1526_);
lean_ctor_set(v___x_1528_, 1, v___x_1527_);
v___x_1529_ = 0;
v___x_1530_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1530_, 0, v___x_1528_);
lean_ctor_set_uint8(v___x_1530_, sizeof(void*)*1, v___x_1529_);
v___x_1531_ = l_Repr_addAppParen(v___x_1530_, v_prec_1517_);
return v___x_1531_;
}
v___jp_1532_:
{
lean_object* v___x_1534_; lean_object* v___x_1535_; uint8_t v___x_1536_; lean_object* v___x_1537_; lean_object* v___x_1538_; 
v___x_1534_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__5));
lean_inc(v___y_1533_);
v___x_1535_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1535_, 0, v___y_1533_);
lean_ctor_set(v___x_1535_, 1, v___x_1534_);
v___x_1536_ = 0;
v___x_1537_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1537_, 0, v___x_1535_);
lean_ctor_set_uint8(v___x_1537_, sizeof(void*)*1, v___x_1536_);
v___x_1538_ = l_Repr_addAppParen(v___x_1537_, v_prec_1517_);
return v___x_1538_;
}
v___jp_1539_:
{
lean_object* v___x_1541_; lean_object* v___x_1542_; uint8_t v___x_1543_; lean_object* v___x_1544_; lean_object* v___x_1545_; 
v___x_1541_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__7));
lean_inc(v___y_1540_);
v___x_1542_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1542_, 0, v___y_1540_);
lean_ctor_set(v___x_1542_, 1, v___x_1541_);
v___x_1543_ = 0;
v___x_1544_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1544_, 0, v___x_1542_);
lean_ctor_set_uint8(v___x_1544_, sizeof(void*)*1, v___x_1543_);
v___x_1545_ = l_Repr_addAppParen(v___x_1544_, v_prec_1517_);
return v___x_1545_;
}
v___jp_1546_:
{
lean_object* v___x_1548_; lean_object* v___x_1549_; uint8_t v___x_1550_; lean_object* v___x_1551_; lean_object* v___x_1552_; 
v___x_1548_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__9));
lean_inc(v___y_1547_);
v___x_1549_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1549_, 0, v___y_1547_);
lean_ctor_set(v___x_1549_, 1, v___x_1548_);
v___x_1550_ = 0;
v___x_1551_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1551_, 0, v___x_1549_);
lean_ctor_set_uint8(v___x_1551_, sizeof(void*)*1, v___x_1550_);
v___x_1552_ = l_Repr_addAppParen(v___x_1551_, v_prec_1517_);
return v___x_1552_;
}
v___jp_1553_:
{
lean_object* v___x_1555_; lean_object* v___x_1556_; uint8_t v___x_1557_; lean_object* v___x_1558_; lean_object* v___x_1559_; 
v___x_1555_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprCellKind_repr___closed__11));
lean_inc(v___y_1554_);
v___x_1556_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1556_, 0, v___y_1554_);
lean_ctor_set(v___x_1556_, 1, v___x_1555_);
v___x_1557_ = 0;
v___x_1558_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1558_, 0, v___x_1556_);
lean_ctor_set_uint8(v___x_1558_, sizeof(void*)*1, v___x_1557_);
v___x_1559_ = l_Repr_addAppParen(v___x_1558_, v_prec_1517_);
return v___x_1559_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprCellKind_repr___boxed(lean_object* v_x_1584_, lean_object* v_prec_1585_){
_start:
{
uint8_t v_x_341__boxed_1586_; lean_object* v_res_1587_; 
v_x_341__boxed_1586_ = lean_unbox(v_x_1584_);
v_res_1587_ = lp_algalVerification_Algal_Source_instReprCellKind_repr(v_x_341__boxed_1586_, v_prec_1585_);
lean_dec(v_prec_1585_);
return v_res_1587_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__7(void){
_start:
{
lean_object* v___x_1603_; lean_object* v___x_1604_; 
v___x_1603_ = lean_unsigned_to_nat(6u);
v___x_1604_ = lean_nat_to_int(v___x_1603_);
return v___x_1604_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__12(void){
_start:
{
lean_object* v___x_1611_; lean_object* v___x_1612_; 
v___x_1611_ = lean_unsigned_to_nat(8u);
v___x_1612_ = lean_nat_to_int(v___x_1611_);
return v___x_1612_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__15(void){
_start:
{
lean_object* v___x_1616_; lean_object* v___x_1617_; 
v___x_1616_ = lean_unsigned_to_nat(10u);
v___x_1617_ = lean_nat_to_int(v___x_1616_);
return v___x_1617_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__18(void){
_start:
{
lean_object* v___x_1621_; lean_object* v___x_1622_; 
v___x_1621_ = lean_unsigned_to_nat(11u);
v___x_1622_ = lean_nat_to_int(v___x_1621_);
return v___x_1622_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__20(void){
_start:
{
lean_object* v___x_1624_; lean_object* v___x_1625_; 
v___x_1624_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__0));
v___x_1625_ = lean_string_length(v___x_1624_);
return v___x_1625_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__21(void){
_start:
{
lean_object* v___x_1626_; lean_object* v___x_1627_; 
v___x_1626_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__20, &lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__20_once, _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__20);
v___x_1627_ = lean_nat_to_int(v___x_1626_);
return v___x_1627_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg(lean_object* v_x_1632_){
_start:
{
lean_object* v_id_1633_; uint8_t v_kind_1634_; lean_object* v_inputs_1635_; uint8_t v_guarded_1636_; lean_object* v___x_1637_; lean_object* v___x_1638_; lean_object* v___x_1639_; lean_object* v___x_1640_; lean_object* v___x_1641_; lean_object* v___x_1642_; uint8_t v___x_1643_; lean_object* v___x_1644_; lean_object* v___x_1645_; lean_object* v___x_1646_; lean_object* v___x_1647_; lean_object* v___x_1648_; lean_object* v___x_1649_; lean_object* v___x_1650_; lean_object* v___x_1651_; lean_object* v___x_1652_; lean_object* v___x_1653_; lean_object* v___x_1654_; lean_object* v___x_1655_; lean_object* v___x_1656_; lean_object* v___x_1657_; lean_object* v___x_1658_; lean_object* v___x_1659_; lean_object* v___x_1660_; lean_object* v___x_1661_; lean_object* v___x_1662_; lean_object* v___x_1663_; lean_object* v___x_1664_; lean_object* v___x_1665_; lean_object* v___x_1666_; lean_object* v___x_1667_; lean_object* v___x_1668_; lean_object* v___x_1669_; lean_object* v___x_1670_; lean_object* v___x_1671_; lean_object* v___x_1672_; lean_object* v___x_1673_; lean_object* v___x_1674_; lean_object* v___x_1675_; lean_object* v___x_1676_; lean_object* v___x_1677_; lean_object* v___x_1678_; lean_object* v___x_1679_; lean_object* v___x_1680_; lean_object* v___x_1681_; lean_object* v___x_1682_; lean_object* v___x_1683_; lean_object* v___x_1684_; lean_object* v___x_1685_; 
v_id_1633_ = lean_ctor_get(v_x_1632_, 0);
lean_inc_ref(v_id_1633_);
v_kind_1634_ = lean_ctor_get_uint8(v_x_1632_, sizeof(void*)*2);
v_inputs_1635_ = lean_ctor_get(v_x_1632_, 1);
lean_inc(v_inputs_1635_);
v_guarded_1636_ = lean_ctor_get_uint8(v_x_1632_, sizeof(void*)*2 + 1);
lean_dec_ref(v_x_1632_);
v___x_1637_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__5));
v___x_1638_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__6));
v___x_1639_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__7, &lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__7_once, _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__7);
v___x_1640_ = l_String_quote(v_id_1633_);
v___x_1641_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v___x_1641_, 0, v___x_1640_);
v___x_1642_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1642_, 0, v___x_1639_);
lean_ctor_set(v___x_1642_, 1, v___x_1641_);
v___x_1643_ = 0;
v___x_1644_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1644_, 0, v___x_1642_);
lean_ctor_set_uint8(v___x_1644_, sizeof(void*)*1, v___x_1643_);
v___x_1645_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1645_, 0, v___x_1638_);
lean_ctor_set(v___x_1645_, 1, v___x_1644_);
v___x_1646_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__9));
v___x_1647_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1647_, 0, v___x_1645_);
lean_ctor_set(v___x_1647_, 1, v___x_1646_);
v___x_1648_ = lean_box(1);
v___x_1649_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1649_, 0, v___x_1647_);
lean_ctor_set(v___x_1649_, 1, v___x_1648_);
v___x_1650_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__11));
v___x_1651_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1651_, 0, v___x_1649_);
lean_ctor_set(v___x_1651_, 1, v___x_1650_);
v___x_1652_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1652_, 0, v___x_1651_);
lean_ctor_set(v___x_1652_, 1, v___x_1637_);
v___x_1653_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__12, &lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__12_once, _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__12);
v___x_1654_ = lean_unsigned_to_nat(0u);
v___x_1655_ = lp_algalVerification_Algal_Source_instReprCellKind_repr(v_kind_1634_, v___x_1654_);
v___x_1656_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1656_, 0, v___x_1653_);
lean_ctor_set(v___x_1656_, 1, v___x_1655_);
v___x_1657_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1657_, 0, v___x_1656_);
lean_ctor_set_uint8(v___x_1657_, sizeof(void*)*1, v___x_1643_);
v___x_1658_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1658_, 0, v___x_1652_);
lean_ctor_set(v___x_1658_, 1, v___x_1657_);
v___x_1659_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1659_, 0, v___x_1658_);
lean_ctor_set(v___x_1659_, 1, v___x_1646_);
v___x_1660_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1660_, 0, v___x_1659_);
lean_ctor_set(v___x_1660_, 1, v___x_1648_);
v___x_1661_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__14));
v___x_1662_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1662_, 0, v___x_1660_);
lean_ctor_set(v___x_1662_, 1, v___x_1661_);
v___x_1663_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1663_, 0, v___x_1662_);
lean_ctor_set(v___x_1663_, 1, v___x_1637_);
v___x_1664_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__15, &lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__15_once, _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__15);
v___x_1665_ = l_List_repr_x27___at___00Lean_Syntax_instReprPreresolved_repr_spec__0___redArg(v_inputs_1635_);
v___x_1666_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1666_, 0, v___x_1664_);
lean_ctor_set(v___x_1666_, 1, v___x_1665_);
v___x_1667_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1667_, 0, v___x_1666_);
lean_ctor_set_uint8(v___x_1667_, sizeof(void*)*1, v___x_1643_);
v___x_1668_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1668_, 0, v___x_1663_);
lean_ctor_set(v___x_1668_, 1, v___x_1667_);
v___x_1669_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1669_, 0, v___x_1668_);
lean_ctor_set(v___x_1669_, 1, v___x_1646_);
v___x_1670_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1670_, 0, v___x_1669_);
lean_ctor_set(v___x_1670_, 1, v___x_1648_);
v___x_1671_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__17));
v___x_1672_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1672_, 0, v___x_1670_);
lean_ctor_set(v___x_1672_, 1, v___x_1671_);
v___x_1673_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1673_, 0, v___x_1672_);
lean_ctor_set(v___x_1673_, 1, v___x_1637_);
v___x_1674_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__18, &lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__18_once, _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__18);
v___x_1675_ = l_Bool_repr___redArg(v_guarded_1636_);
v___x_1676_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1676_, 0, v___x_1674_);
lean_ctor_set(v___x_1676_, 1, v___x_1675_);
v___x_1677_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1677_, 0, v___x_1676_);
lean_ctor_set_uint8(v___x_1677_, sizeof(void*)*1, v___x_1643_);
v___x_1678_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1678_, 0, v___x_1673_);
lean_ctor_set(v___x_1678_, 1, v___x_1677_);
v___x_1679_ = lean_obj_once(&lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__21, &lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__21_once, _init_lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__21);
v___x_1680_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__22));
v___x_1681_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1681_, 0, v___x_1680_);
lean_ctor_set(v___x_1681_, 1, v___x_1678_);
v___x_1682_ = ((lean_object*)(lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg___closed__23));
v___x_1683_ = lean_alloc_ctor(5, 2, 0);
lean_ctor_set(v___x_1683_, 0, v___x_1681_);
lean_ctor_set(v___x_1683_, 1, v___x_1682_);
v___x_1684_ = lean_alloc_ctor(4, 2, 0);
lean_ctor_set(v___x_1684_, 0, v___x_1679_);
lean_ctor_set(v___x_1684_, 1, v___x_1683_);
v___x_1685_ = lean_alloc_ctor(6, 1, 1);
lean_ctor_set(v___x_1685_, 0, v___x_1684_);
lean_ctor_set_uint8(v___x_1685_, sizeof(void*)*1, v___x_1643_);
return v___x_1685_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr(lean_object* v_x_1686_, lean_object* v_prec_1687_){
_start:
{
lean_object* v___x_1688_; 
v___x_1688_ = lp_algalVerification_Algal_Source_instReprOutlineCell_repr___redArg(v_x_1686_);
return v___x_1688_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_instReprOutlineCell_repr___boxed(lean_object* v_x_1689_, lean_object* v_prec_1690_){
_start:
{
lean_object* v_res_1691_; 
v_res_1691_ = lp_algalVerification_Algal_Source_instReprOutlineCell_repr(v_x_1689_, v_prec_1690_);
lean_dec(v_prec_1690_);
return v_res_1691_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_programIdentity(lean_object* v_p_1694_){
_start:
{
lean_object* v_bindings_1695_; lean_object* v_result_1696_; lean_object* v___x_1697_; 
v_bindings_1695_ = lean_ctor_get(v_p_1694_, 2);
v_result_1696_ = lean_ctor_get(v_p_1694_, 3);
lean_inc_ref(v_result_1696_);
lean_inc(v_bindings_1695_);
v___x_1697_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_1697_, 0, v_bindings_1695_);
lean_ctor_set(v___x_1697_, 1, v_result_1696_);
return v___x_1697_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Source_programIdentity___boxed(lean_object* v_p_1698_){
_start:
{
lean_object* v_res_1699_; 
v_res_1699_ = lp_algalVerification_Algal_Source_programIdentity(v_p_1698_);
lean_dec_ref(v_p_1698_);
return v_res_1699_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Binary64(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Json(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Source_Model(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_Binary64(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Json(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Source_maxSourceBytes = _init_lp_algalVerification_Algal_Source_maxSourceBytes();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxSourceBytes);
lp_algalVerification_Algal_Source_maxTokens = _init_lp_algalVerification_Algal_Source_maxTokens();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxTokens);
lp_algalVerification_Algal_Source_maxNodes = _init_lp_algalVerification_Algal_Source_maxNodes();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxNodes);
lp_algalVerification_Algal_Source_maxExprDepth = _init_lp_algalVerification_Algal_Source_maxExprDepth();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxExprDepth);
lp_algalVerification_Algal_Source_maxBindings = _init_lp_algalVerification_Algal_Source_maxBindings();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxBindings);
lp_algalVerification_Algal_Source_maxParameters = _init_lp_algalVerification_Algal_Source_maxParameters();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxParameters);
lp_algalVerification_Algal_Source_maxNameLength = _init_lp_algalVerification_Algal_Source_maxNameLength();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxNameLength);
lp_algalVerification_Algal_Source_maxCollectionItems = _init_lp_algalVerification_Algal_Source_maxCollectionItems();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxCollectionItems);
lp_algalVerification_Algal_Source_maxFiles = _init_lp_algalVerification_Algal_Source_maxFiles();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxFiles);
lp_algalVerification_Algal_Source_maxImports = _init_lp_algalVerification_Algal_Source_maxImports();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxImports);
lp_algalVerification_Algal_Source_maxProjectBytes = _init_lp_algalVerification_Algal_Source_maxProjectBytes();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxProjectBytes);
lp_algalVerification_Algal_Source_maxImportDepth = _init_lp_algalVerification_Algal_Source_maxImportDepth();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxImportDepth);
lp_algalVerification_Algal_Source_maxRecords = _init_lp_algalVerification_Algal_Source_maxRecords();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxRecords);
lp_algalVerification_Algal_Source_maxRecordFields = _init_lp_algalVerification_Algal_Source_maxRecordFields();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxRecordFields);
lp_algalVerification_Algal_Source_maxSchemaLevels = _init_lp_algalVerification_Algal_Source_maxSchemaLevels();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxSchemaLevels);
lp_algalVerification_Algal_Source_maxSchemaDepth = _init_lp_algalVerification_Algal_Source_maxSchemaDepth();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxSchemaDepth);
lp_algalVerification_Algal_Source_maxCells = _init_lp_algalVerification_Algal_Source_maxCells();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxCells);
lp_algalVerification_Algal_Source_maxEdges = _init_lp_algalVerification_Algal_Source_maxEdges();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxEdges);
lp_algalVerification_Algal_Source_maxEachItems = _init_lp_algalVerification_Algal_Source_maxEachItems();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxEachItems);
lp_algalVerification_Algal_Source_maxChoiceLabels = _init_lp_algalVerification_Algal_Source_maxChoiceLabels();
lean_mark_persistent(lp_algalVerification_Algal_Source_maxChoiceLabels);
lp_algalVerification_Algal_Source_contractMaxDepth = _init_lp_algalVerification_Algal_Source_contractMaxDepth();
lean_mark_persistent(lp_algalVerification_Algal_Source_contractMaxDepth);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
