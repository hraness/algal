// Lean compiler output
// Module: Algal.Core.Json
// Imports: public import Init public meta import Init public import Algal.Core.Binary64 public import Algal.Core.OwnMap public import Algal.Core.Text
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
uint8_t lean_uint64_dec_eq(uint64_t, uint64_t);
uint8_t lean_string_dec_eq(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Binary64_admit(uint64_t);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
uint64_t lp_algalVerification_Algal_Core_Binary64_normalizeBits(uint64_t);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_null_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_null_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_bool_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_bool_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_number_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_number_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_text_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_text_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_array_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_array_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_object_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_object_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_nil_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_nil_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_cons_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_cons_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_nil_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_nil_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_cons_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_cons_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__3(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__2(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__2___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__3___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__3(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__1(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__3___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__1___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__1(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__2(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__2___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__1___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_normalizeItems(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_normalizeNumbers(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_normalizeFields(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeNumbers_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeNumbers_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeItems_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeItems_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeFields_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeFields_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_null_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_null_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_bool_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_bool_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_number_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_number_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_text_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_text_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilItems_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilItems_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consItems_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consItems_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_array_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_array_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilFields_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilFields_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consFields_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consFields_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_object_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_object_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqToken_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqToken_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqToken(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqToken___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorIdx(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorElim(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_value_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_value_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_items_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_items_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_fields_elim___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_fields_elim(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFrame_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFrame_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFrame(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFrame___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_step___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_step___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_step___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_step___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_step___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_step___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_step___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 2}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_step___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_step___closed__2_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_step(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Core_Json_execute_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_execute(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_encodeFields___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(7) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_encodeFields___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_encodeFields___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_encode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_encode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_encode___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_encodeItems___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(4) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_encodeItems___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_encodeItems___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_encodeItems___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(5) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_encodeItems___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_encodeItems___closed__1_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_encodeItems(lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_encode___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(6) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_encode___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_encode___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_encode___closed__2_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(9) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_encode___closed__2 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_encode___closed__2_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_encode(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_encodeFields(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__13_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__13_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__6_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__6_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__8_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__8_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__11_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__11_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Json_decode___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Json_decode___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Json_decode___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_decode(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorIdx(lean_object* v_x_1_){
_start:
{
switch(lean_obj_tag(v_x_1_))
{
case 0:
{
lean_object* v___x_2_; 
v___x_2_ = lean_unsigned_to_nat(0u);
return v___x_2_;
}
case 1:
{
lean_object* v___x_3_; 
v___x_3_ = lean_unsigned_to_nat(1u);
return v___x_3_;
}
case 2:
{
lean_object* v___x_4_; 
v___x_4_ = lean_unsigned_to_nat(2u);
return v___x_4_;
}
case 3:
{
lean_object* v___x_5_; 
v___x_5_ = lean_unsigned_to_nat(3u);
return v___x_5_;
}
case 4:
{
lean_object* v___x_6_; 
v___x_6_ = lean_unsigned_to_nat(4u);
return v___x_6_;
}
default: 
{
lean_object* v___x_7_; 
v___x_7_ = lean_unsigned_to_nat(5u);
return v___x_7_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorIdx___boxed(lean_object* v_x_8_){
_start:
{
lean_object* v_res_9_; 
v_res_9_ = lp_algalVerification_Algal_Core_Json_Value_ctorIdx(v_x_8_);
lean_dec(v_x_8_);
return v_res_9_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(lean_object* v_t_10_, lean_object* v_k_11_){
_start:
{
switch(lean_obj_tag(v_t_10_))
{
case 0:
{
return v_k_11_;
}
case 1:
{
uint8_t v_value_12_; lean_object* v___x_13_; lean_object* v___x_14_; 
v_value_12_ = lean_ctor_get_uint8(v_t_10_, 0);
lean_dec_ref_known(v_t_10_, 0);
v___x_13_ = lean_box(v_value_12_);
v___x_14_ = lean_apply_1(v_k_11_, v___x_13_);
return v___x_14_;
}
case 2:
{
uint64_t v_value_15_; lean_object* v___x_16_; lean_object* v___x_17_; 
v_value_15_ = lean_ctor_get_uint64(v_t_10_, 0);
lean_dec_ref_known(v_t_10_, 0);
v___x_16_ = lean_box_uint64(v_value_15_);
v___x_17_ = lean_apply_1(v_k_11_, v___x_16_);
return v___x_17_;
}
case 3:
{
lean_object* v_value_18_; lean_object* v___x_19_; 
v_value_18_ = lean_ctor_get(v_t_10_, 0);
lean_inc_ref(v_value_18_);
lean_dec_ref_known(v_t_10_, 1);
v___x_19_ = lean_apply_1(v_k_11_, v_value_18_);
return v___x_19_;
}
default: 
{
lean_object* v_values_20_; lean_object* v___x_21_; 
v_values_20_ = lean_ctor_get(v_t_10_, 0);
lean_inc(v_values_20_);
lean_dec(v_t_10_);
v___x_21_ = lean_apply_1(v_k_11_, v_values_20_);
return v___x_21_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorElim(lean_object* v_motive__1_22_, lean_object* v_ctorIdx_23_, lean_object* v_t_24_, lean_object* v_h_25_, lean_object* v_k_26_){
_start:
{
lean_object* v___x_27_; 
v___x_27_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_24_, v_k_26_);
return v___x_27_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_ctorElim___boxed(lean_object* v_motive__1_28_, lean_object* v_ctorIdx_29_, lean_object* v_t_30_, lean_object* v_h_31_, lean_object* v_k_32_){
_start:
{
lean_object* v_res_33_; 
v_res_33_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim(v_motive__1_28_, v_ctorIdx_29_, v_t_30_, v_h_31_, v_k_32_);
lean_dec(v_ctorIdx_29_);
return v_res_33_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_null_elim___redArg(lean_object* v_t_34_, lean_object* v_null_35_){
_start:
{
lean_object* v___x_36_; 
v___x_36_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_34_, v_null_35_);
return v___x_36_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_null_elim(lean_object* v_motive__1_37_, lean_object* v_t_38_, lean_object* v_h_39_, lean_object* v_null_40_){
_start:
{
lean_object* v___x_41_; 
v___x_41_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_38_, v_null_40_);
return v___x_41_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_bool_elim___redArg(lean_object* v_t_42_, lean_object* v_bool_43_){
_start:
{
lean_object* v___x_44_; 
v___x_44_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_42_, v_bool_43_);
return v___x_44_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_bool_elim(lean_object* v_motive__1_45_, lean_object* v_t_46_, lean_object* v_h_47_, lean_object* v_bool_48_){
_start:
{
lean_object* v___x_49_; 
v___x_49_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_46_, v_bool_48_);
return v___x_49_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_number_elim___redArg(lean_object* v_t_50_, lean_object* v_number_51_){
_start:
{
lean_object* v___x_52_; 
v___x_52_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_50_, v_number_51_);
return v___x_52_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_number_elim(lean_object* v_motive__1_53_, lean_object* v_t_54_, lean_object* v_h_55_, lean_object* v_number_56_){
_start:
{
lean_object* v___x_57_; 
v___x_57_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_54_, v_number_56_);
return v___x_57_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_text_elim___redArg(lean_object* v_t_58_, lean_object* v_text_59_){
_start:
{
lean_object* v___x_60_; 
v___x_60_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_58_, v_text_59_);
return v___x_60_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_text_elim(lean_object* v_motive__1_61_, lean_object* v_t_62_, lean_object* v_h_63_, lean_object* v_text_64_){
_start:
{
lean_object* v___x_65_; 
v___x_65_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_62_, v_text_64_);
return v___x_65_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_array_elim___redArg(lean_object* v_t_66_, lean_object* v_array_67_){
_start:
{
lean_object* v___x_68_; 
v___x_68_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_66_, v_array_67_);
return v___x_68_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_array_elim(lean_object* v_motive__1_69_, lean_object* v_t_70_, lean_object* v_h_71_, lean_object* v_array_72_){
_start:
{
lean_object* v___x_73_; 
v___x_73_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_70_, v_array_72_);
return v___x_73_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_object_elim___redArg(lean_object* v_t_74_, lean_object* v_object_75_){
_start:
{
lean_object* v___x_76_; 
v___x_76_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_74_, v_object_75_);
return v___x_76_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Value_object_elim(lean_object* v_motive__1_77_, lean_object* v_t_78_, lean_object* v_h_79_, lean_object* v_object_80_){
_start:
{
lean_object* v___x_81_; 
v___x_81_ = lp_algalVerification_Algal_Core_Json_Value_ctorElim___redArg(v_t_78_, v_object_80_);
return v___x_81_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorIdx(lean_object* v_x_82_){
_start:
{
if (lean_obj_tag(v_x_82_) == 0)
{
lean_object* v___x_83_; 
v___x_83_ = lean_unsigned_to_nat(0u);
return v___x_83_;
}
else
{
lean_object* v___x_84_; 
v___x_84_ = lean_unsigned_to_nat(1u);
return v___x_84_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorIdx___boxed(lean_object* v_x_85_){
_start:
{
lean_object* v_res_86_; 
v_res_86_ = lp_algalVerification_Algal_Core_Json_Items_ctorIdx(v_x_85_);
lean_dec(v_x_85_);
return v_res_86_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorElim___redArg(lean_object* v_t_87_, lean_object* v_k_88_){
_start:
{
if (lean_obj_tag(v_t_87_) == 0)
{
return v_k_88_;
}
else
{
lean_object* v_value_89_; lean_object* v_rest_90_; lean_object* v___x_91_; 
v_value_89_ = lean_ctor_get(v_t_87_, 0);
lean_inc(v_value_89_);
v_rest_90_ = lean_ctor_get(v_t_87_, 1);
lean_inc(v_rest_90_);
lean_dec_ref_known(v_t_87_, 2);
v___x_91_ = lean_apply_2(v_k_88_, v_value_89_, v_rest_90_);
return v___x_91_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorElim(lean_object* v_motive__2_92_, lean_object* v_ctorIdx_93_, lean_object* v_t_94_, lean_object* v_h_95_, lean_object* v_k_96_){
_start:
{
lean_object* v___x_97_; 
v___x_97_ = lp_algalVerification_Algal_Core_Json_Items_ctorElim___redArg(v_t_94_, v_k_96_);
return v___x_97_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_ctorElim___boxed(lean_object* v_motive__2_98_, lean_object* v_ctorIdx_99_, lean_object* v_t_100_, lean_object* v_h_101_, lean_object* v_k_102_){
_start:
{
lean_object* v_res_103_; 
v_res_103_ = lp_algalVerification_Algal_Core_Json_Items_ctorElim(v_motive__2_98_, v_ctorIdx_99_, v_t_100_, v_h_101_, v_k_102_);
lean_dec(v_ctorIdx_99_);
return v_res_103_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_nil_elim___redArg(lean_object* v_t_104_, lean_object* v_nil_105_){
_start:
{
lean_object* v___x_106_; 
v___x_106_ = lp_algalVerification_Algal_Core_Json_Items_ctorElim___redArg(v_t_104_, v_nil_105_);
return v___x_106_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_nil_elim(lean_object* v_motive__2_107_, lean_object* v_t_108_, lean_object* v_h_109_, lean_object* v_nil_110_){
_start:
{
lean_object* v___x_111_; 
v___x_111_ = lp_algalVerification_Algal_Core_Json_Items_ctorElim___redArg(v_t_108_, v_nil_110_);
return v___x_111_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_cons_elim___redArg(lean_object* v_t_112_, lean_object* v_cons_113_){
_start:
{
lean_object* v___x_114_; 
v___x_114_ = lp_algalVerification_Algal_Core_Json_Items_ctorElim___redArg(v_t_112_, v_cons_113_);
return v___x_114_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Items_cons_elim(lean_object* v_motive__2_115_, lean_object* v_t_116_, lean_object* v_h_117_, lean_object* v_cons_118_){
_start:
{
lean_object* v___x_119_; 
v___x_119_ = lp_algalVerification_Algal_Core_Json_Items_ctorElim___redArg(v_t_116_, v_cons_118_);
return v___x_119_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorIdx(lean_object* v_x_120_){
_start:
{
if (lean_obj_tag(v_x_120_) == 0)
{
lean_object* v___x_121_; 
v___x_121_ = lean_unsigned_to_nat(0u);
return v___x_121_;
}
else
{
lean_object* v___x_122_; 
v___x_122_ = lean_unsigned_to_nat(1u);
return v___x_122_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorIdx___boxed(lean_object* v_x_123_){
_start:
{
lean_object* v_res_124_; 
v_res_124_ = lp_algalVerification_Algal_Core_Json_Fields_ctorIdx(v_x_123_);
lean_dec(v_x_123_);
return v_res_124_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorElim___redArg(lean_object* v_t_125_, lean_object* v_k_126_){
_start:
{
if (lean_obj_tag(v_t_125_) == 0)
{
return v_k_126_;
}
else
{
lean_object* v_key_127_; lean_object* v_value_128_; lean_object* v_rest_129_; lean_object* v___x_130_; 
v_key_127_ = lean_ctor_get(v_t_125_, 0);
lean_inc_ref(v_key_127_);
v_value_128_ = lean_ctor_get(v_t_125_, 1);
lean_inc(v_value_128_);
v_rest_129_ = lean_ctor_get(v_t_125_, 2);
lean_inc(v_rest_129_);
lean_dec_ref_known(v_t_125_, 3);
v___x_130_ = lean_apply_3(v_k_126_, v_key_127_, v_value_128_, v_rest_129_);
return v___x_130_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorElim(lean_object* v_motive__3_131_, lean_object* v_ctorIdx_132_, lean_object* v_t_133_, lean_object* v_h_134_, lean_object* v_k_135_){
_start:
{
lean_object* v___x_136_; 
v___x_136_ = lp_algalVerification_Algal_Core_Json_Fields_ctorElim___redArg(v_t_133_, v_k_135_);
return v___x_136_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_ctorElim___boxed(lean_object* v_motive__3_137_, lean_object* v_ctorIdx_138_, lean_object* v_t_139_, lean_object* v_h_140_, lean_object* v_k_141_){
_start:
{
lean_object* v_res_142_; 
v_res_142_ = lp_algalVerification_Algal_Core_Json_Fields_ctorElim(v_motive__3_137_, v_ctorIdx_138_, v_t_139_, v_h_140_, v_k_141_);
lean_dec(v_ctorIdx_138_);
return v_res_142_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_nil_elim___redArg(lean_object* v_t_143_, lean_object* v_nil_144_){
_start:
{
lean_object* v___x_145_; 
v___x_145_ = lp_algalVerification_Algal_Core_Json_Fields_ctorElim___redArg(v_t_143_, v_nil_144_);
return v___x_145_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_nil_elim(lean_object* v_motive__3_146_, lean_object* v_t_147_, lean_object* v_h_148_, lean_object* v_nil_149_){
_start:
{
lean_object* v___x_150_; 
v___x_150_ = lp_algalVerification_Algal_Core_Json_Fields_ctorElim___redArg(v_t_147_, v_nil_149_);
return v___x_150_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_cons_elim___redArg(lean_object* v_t_151_, lean_object* v_cons_152_){
_start:
{
lean_object* v___x_153_; 
v___x_153_ = lp_algalVerification_Algal_Core_Json_Fields_ctorElim___redArg(v_t_151_, v_cons_152_);
return v___x_153_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Fields_cons_elim(lean_object* v_motive__3_154_, lean_object* v_t_155_, lean_object* v_h_156_, lean_object* v_cons_157_){
_start:
{
lean_object* v___x_158_; 
v___x_158_ = lp_algalVerification_Algal_Core_Json_Fields_ctorElim___redArg(v_t_155_, v_cons_157_);
return v___x_158_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__3(lean_object* v_x_159_, lean_object* v_x_160_){
_start:
{
if (lean_obj_tag(v_x_159_) == 0)
{
if (lean_obj_tag(v_x_160_) == 0)
{
uint8_t v___x_161_; 
v___x_161_ = 1;
return v___x_161_;
}
else
{
uint8_t v___x_162_; 
v___x_162_ = 0;
return v___x_162_;
}
}
else
{
lean_object* v_key_163_; lean_object* v_value_164_; lean_object* v_rest_165_; uint8_t v___x_166_; 
v_key_163_ = lean_ctor_get(v_x_159_, 0);
v_value_164_ = lean_ctor_get(v_x_159_, 1);
v_rest_165_ = lean_ctor_get(v_x_159_, 2);
v___x_166_ = 0;
if (lean_obj_tag(v_x_160_) == 0)
{
return v___x_166_;
}
else
{
lean_object* v_key_167_; lean_object* v_value_168_; lean_object* v_rest_169_; uint8_t v___x_170_; 
v_key_167_ = lean_ctor_get(v_x_160_, 0);
v_value_168_ = lean_ctor_get(v_x_160_, 1);
v_rest_169_ = lean_ctor_get(v_x_160_, 2);
v___x_170_ = lean_string_dec_eq(v_key_163_, v_key_167_);
if (v___x_170_ == 0)
{
return v___x_166_;
}
else
{
uint8_t v_inst_171_; 
v_inst_171_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_value_164_, v_value_168_);
if (v_inst_171_ == 0)
{
return v___x_166_;
}
else
{
uint8_t v_inst_172_; 
v_inst_172_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__3(v_rest_165_, v_rest_169_);
if (v_inst_172_ == 0)
{
return v___x_166_;
}
else
{
return v_inst_172_;
}
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(lean_object* v_x_173_, lean_object* v_x_174_){
_start:
{
switch(lean_obj_tag(v_x_173_))
{
case 0:
{
if (lean_obj_tag(v_x_174_) == 0)
{
uint8_t v___x_175_; 
v___x_175_ = 1;
return v___x_175_;
}
else
{
uint8_t v___x_176_; 
v___x_176_ = 0;
return v___x_176_;
}
}
case 1:
{
uint8_t v_value_177_; uint8_t v___x_178_; 
v_value_177_ = lean_ctor_get_uint8(v_x_173_, 0);
v___x_178_ = 0;
switch(lean_obj_tag(v_x_174_))
{
case 0:
{
return v___x_178_;
}
case 1:
{
if (v_value_177_ == 0)
{
uint8_t v_value_179_; 
v_value_179_ = lean_ctor_get_uint8(v_x_174_, 0);
if (v_value_179_ == 0)
{
uint8_t v___x_180_; 
v___x_180_ = 1;
return v___x_180_;
}
else
{
return v___x_178_;
}
}
else
{
uint8_t v_value_181_; 
v_value_181_ = lean_ctor_get_uint8(v_x_174_, 0);
if (v_value_181_ == 0)
{
return v___x_178_;
}
else
{
return v_value_181_;
}
}
}
default: 
{
return v___x_178_;
}
}
}
case 2:
{
uint64_t v_value_182_; uint8_t v___x_183_; 
v_value_182_ = lean_ctor_get_uint64(v_x_173_, 0);
v___x_183_ = 0;
switch(lean_obj_tag(v_x_174_))
{
case 0:
{
return v___x_183_;
}
case 2:
{
uint64_t v_value_184_; uint8_t v___x_185_; 
v_value_184_ = lean_ctor_get_uint64(v_x_174_, 0);
v___x_185_ = lean_uint64_dec_eq(v_value_182_, v_value_184_);
if (v___x_185_ == 0)
{
return v___x_183_;
}
else
{
return v___x_185_;
}
}
default: 
{
return v___x_183_;
}
}
}
case 3:
{
lean_object* v_value_186_; uint8_t v___x_187_; 
v_value_186_ = lean_ctor_get(v_x_173_, 0);
v___x_187_ = 0;
switch(lean_obj_tag(v_x_174_))
{
case 0:
{
return v___x_187_;
}
case 3:
{
lean_object* v_value_188_; uint8_t v___x_189_; 
v_value_188_ = lean_ctor_get(v_x_174_, 0);
v___x_189_ = lean_string_dec_eq(v_value_186_, v_value_188_);
if (v___x_189_ == 0)
{
return v___x_187_;
}
else
{
return v___x_189_;
}
}
default: 
{
return v___x_187_;
}
}
}
case 4:
{
lean_object* v_values_190_; uint8_t v___x_191_; 
v_values_190_ = lean_ctor_get(v_x_173_, 0);
v___x_191_ = 0;
switch(lean_obj_tag(v_x_174_))
{
case 0:
{
return v___x_191_;
}
case 4:
{
lean_object* v_values_192_; uint8_t v_inst_193_; 
v_values_192_ = lean_ctor_get(v_x_174_, 0);
v_inst_193_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__2(v_values_190_, v_values_192_);
if (v_inst_193_ == 0)
{
return v___x_191_;
}
else
{
return v_inst_193_;
}
}
default: 
{
return v___x_191_;
}
}
}
default: 
{
lean_object* v_fields_194_; uint8_t v___x_195_; 
v_fields_194_ = lean_ctor_get(v_x_173_, 0);
v___x_195_ = 0;
switch(lean_obj_tag(v_x_174_))
{
case 0:
{
return v___x_195_;
}
case 5:
{
lean_object* v_fields_196_; uint8_t v_inst_197_; 
v_fields_196_ = lean_ctor_get(v_x_174_, 0);
v_inst_197_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__3(v_fields_194_, v_fields_196_);
if (v_inst_197_ == 0)
{
return v___x_195_;
}
else
{
return v_inst_197_;
}
}
default: 
{
return v___x_195_;
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__2(lean_object* v_x_198_, lean_object* v_x_199_){
_start:
{
if (lean_obj_tag(v_x_198_) == 0)
{
if (lean_obj_tag(v_x_199_) == 0)
{
uint8_t v___x_200_; 
v___x_200_ = 1;
return v___x_200_;
}
else
{
uint8_t v___x_201_; 
v___x_201_ = 0;
return v___x_201_;
}
}
else
{
lean_object* v_value_202_; lean_object* v_rest_203_; uint8_t v___x_204_; 
v_value_202_ = lean_ctor_get(v_x_198_, 0);
v_rest_203_ = lean_ctor_get(v_x_198_, 1);
v___x_204_ = 0;
if (lean_obj_tag(v_x_199_) == 0)
{
return v___x_204_;
}
else
{
lean_object* v_value_205_; lean_object* v_rest_206_; uint8_t v_inst_207_; 
v_value_205_ = lean_ctor_get(v_x_199_, 0);
v_rest_206_ = lean_ctor_get(v_x_199_, 1);
v_inst_207_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_value_202_, v_value_205_);
if (v_inst_207_ == 0)
{
return v___x_204_;
}
else
{
uint8_t v_inst_208_; 
v_inst_208_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__2(v_rest_203_, v_rest_206_);
if (v_inst_208_ == 0)
{
return v___x_204_;
}
else
{
return v_inst_208_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__2___boxed(lean_object* v_x_209_, lean_object* v_x_210_){
_start:
{
uint8_t v_res_211_; lean_object* v_r_212_; 
v_res_211_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__2(v_x_209_, v_x_210_);
lean_dec(v_x_210_);
lean_dec(v_x_209_);
v_r_212_ = lean_box(v_res_211_);
return v_r_212_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__3___boxed(lean_object* v_x_213_, lean_object* v_x_214_){
_start:
{
uint8_t v_res_215_; lean_object* v_r_216_; 
v_res_215_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__3(v_x_213_, v_x_214_);
lean_dec(v_x_214_);
lean_dec(v_x_213_);
v_r_216_ = lean_box(v_res_215_);
return v_r_216_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1___boxed(lean_object* v_x_217_, lean_object* v_x_218_){
_start:
{
uint8_t v_res_219_; lean_object* v_r_220_; 
v_res_219_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_x_217_, v_x_218_);
lean_dec(v_x_218_);
lean_dec(v_x_217_);
v_r_220_ = lean_box(v_res_219_);
return v_r_220_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqValue(lean_object* v_x_221_, lean_object* v_x_222_){
_start:
{
uint8_t v___x_223_; 
v___x_223_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_x_221_, v_x_222_);
return v___x_223_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqValue___boxed(lean_object* v_x_224_, lean_object* v_x_225_){
_start:
{
uint8_t v_res_226_; lean_object* v_r_227_; 
v_res_226_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue(v_x_224_, v_x_225_);
lean_dec(v_x_225_);
lean_dec(v_x_224_);
v_r_227_ = lean_box(v_res_226_);
return v_r_227_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__3(lean_object* v_x_228_, lean_object* v_x_229_){
_start:
{
if (lean_obj_tag(v_x_228_) == 0)
{
if (lean_obj_tag(v_x_229_) == 0)
{
uint8_t v___x_230_; 
v___x_230_ = 1;
return v___x_230_;
}
else
{
uint8_t v___x_231_; 
v___x_231_ = 0;
return v___x_231_;
}
}
else
{
lean_object* v_key_232_; lean_object* v_value_233_; lean_object* v_rest_234_; uint8_t v___x_235_; 
v_key_232_ = lean_ctor_get(v_x_228_, 0);
v_value_233_ = lean_ctor_get(v_x_228_, 1);
v_rest_234_ = lean_ctor_get(v_x_228_, 2);
v___x_235_ = 0;
if (lean_obj_tag(v_x_229_) == 0)
{
return v___x_235_;
}
else
{
lean_object* v_key_236_; lean_object* v_value_237_; lean_object* v_rest_238_; uint8_t v___x_239_; 
v_key_236_ = lean_ctor_get(v_x_229_, 0);
v_value_237_ = lean_ctor_get(v_x_229_, 1);
v_rest_238_ = lean_ctor_get(v_x_229_, 2);
v___x_239_ = lean_string_dec_eq(v_key_232_, v_key_236_);
if (v___x_239_ == 0)
{
return v___x_235_;
}
else
{
uint8_t v_inst_240_; 
v_inst_240_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__1(v_value_233_, v_value_237_);
if (v_inst_240_ == 0)
{
return v___x_235_;
}
else
{
uint8_t v_inst_241_; 
v_inst_241_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__3(v_rest_234_, v_rest_238_);
if (v_inst_241_ == 0)
{
return v___x_235_;
}
else
{
return v_inst_241_;
}
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__1(lean_object* v_x_242_, lean_object* v_x_243_){
_start:
{
switch(lean_obj_tag(v_x_242_))
{
case 0:
{
if (lean_obj_tag(v_x_243_) == 0)
{
uint8_t v___x_244_; 
v___x_244_ = 1;
return v___x_244_;
}
else
{
uint8_t v___x_245_; 
v___x_245_ = 0;
return v___x_245_;
}
}
case 1:
{
uint8_t v_value_246_; uint8_t v___x_247_; 
v_value_246_ = lean_ctor_get_uint8(v_x_242_, 0);
v___x_247_ = 0;
switch(lean_obj_tag(v_x_243_))
{
case 0:
{
return v___x_247_;
}
case 1:
{
if (v_value_246_ == 0)
{
uint8_t v_value_248_; 
v_value_248_ = lean_ctor_get_uint8(v_x_243_, 0);
if (v_value_248_ == 0)
{
uint8_t v___x_249_; 
v___x_249_ = 1;
return v___x_249_;
}
else
{
return v___x_247_;
}
}
else
{
uint8_t v_value_250_; 
v_value_250_ = lean_ctor_get_uint8(v_x_243_, 0);
if (v_value_250_ == 0)
{
return v___x_247_;
}
else
{
return v_value_250_;
}
}
}
default: 
{
return v___x_247_;
}
}
}
case 2:
{
uint64_t v_value_251_; uint8_t v___x_252_; 
v_value_251_ = lean_ctor_get_uint64(v_x_242_, 0);
v___x_252_ = 0;
switch(lean_obj_tag(v_x_243_))
{
case 0:
{
return v___x_252_;
}
case 2:
{
uint64_t v_value_253_; uint8_t v___x_254_; 
v_value_253_ = lean_ctor_get_uint64(v_x_243_, 0);
v___x_254_ = lean_uint64_dec_eq(v_value_251_, v_value_253_);
if (v___x_254_ == 0)
{
return v___x_252_;
}
else
{
return v___x_254_;
}
}
default: 
{
return v___x_252_;
}
}
}
case 3:
{
lean_object* v_value_255_; uint8_t v___x_256_; 
v_value_255_ = lean_ctor_get(v_x_242_, 0);
v___x_256_ = 0;
switch(lean_obj_tag(v_x_243_))
{
case 0:
{
return v___x_256_;
}
case 3:
{
lean_object* v_value_257_; uint8_t v___x_258_; 
v_value_257_ = lean_ctor_get(v_x_243_, 0);
v___x_258_ = lean_string_dec_eq(v_value_255_, v_value_257_);
if (v___x_258_ == 0)
{
return v___x_256_;
}
else
{
return v___x_258_;
}
}
default: 
{
return v___x_256_;
}
}
}
case 4:
{
lean_object* v_values_259_; uint8_t v___x_260_; 
v_values_259_ = lean_ctor_get(v_x_242_, 0);
v___x_260_ = 0;
switch(lean_obj_tag(v_x_243_))
{
case 0:
{
return v___x_260_;
}
case 4:
{
lean_object* v_values_261_; uint8_t v_inst_262_; 
v_values_261_ = lean_ctor_get(v_x_243_, 0);
v_inst_262_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_values_259_, v_values_261_);
if (v_inst_262_ == 0)
{
return v___x_260_;
}
else
{
return v_inst_262_;
}
}
default: 
{
return v___x_260_;
}
}
}
default: 
{
lean_object* v_fields_263_; uint8_t v___x_264_; 
v_fields_263_ = lean_ctor_get(v_x_242_, 0);
v___x_264_ = 0;
switch(lean_obj_tag(v_x_243_))
{
case 0:
{
return v___x_264_;
}
case 5:
{
lean_object* v_fields_265_; uint8_t v_inst_266_; 
v_fields_265_ = lean_ctor_get(v_x_243_, 0);
v_inst_266_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__3(v_fields_263_, v_fields_265_);
if (v_inst_266_ == 0)
{
return v___x_264_;
}
else
{
return v_inst_266_;
}
}
default: 
{
return v___x_264_;
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(lean_object* v_x_267_, lean_object* v_x_268_){
_start:
{
if (lean_obj_tag(v_x_267_) == 0)
{
if (lean_obj_tag(v_x_268_) == 0)
{
uint8_t v___x_269_; 
v___x_269_ = 1;
return v___x_269_;
}
else
{
uint8_t v___x_270_; 
v___x_270_ = 0;
return v___x_270_;
}
}
else
{
lean_object* v_value_271_; lean_object* v_rest_272_; uint8_t v___x_273_; 
v_value_271_ = lean_ctor_get(v_x_267_, 0);
v_rest_272_ = lean_ctor_get(v_x_267_, 1);
v___x_273_ = 0;
if (lean_obj_tag(v_x_268_) == 0)
{
return v___x_273_;
}
else
{
lean_object* v_value_274_; lean_object* v_rest_275_; uint8_t v_inst_276_; 
v_value_274_ = lean_ctor_get(v_x_268_, 0);
v_rest_275_ = lean_ctor_get(v_x_268_, 1);
v_inst_276_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__1(v_value_271_, v_value_274_);
if (v_inst_276_ == 0)
{
return v___x_273_;
}
else
{
uint8_t v_inst_277_; 
v_inst_277_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_rest_272_, v_rest_275_);
if (v_inst_277_ == 0)
{
return v___x_273_;
}
else
{
return v_inst_277_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2___boxed(lean_object* v_x_278_, lean_object* v_x_279_){
_start:
{
uint8_t v_res_280_; lean_object* v_r_281_; 
v_res_280_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_x_278_, v_x_279_);
lean_dec(v_x_279_);
lean_dec(v_x_278_);
v_r_281_ = lean_box(v_res_280_);
return v_r_281_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__3___boxed(lean_object* v_x_282_, lean_object* v_x_283_){
_start:
{
uint8_t v_res_284_; lean_object* v_r_285_; 
v_res_284_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__3(v_x_282_, v_x_283_);
lean_dec(v_x_283_);
lean_dec(v_x_282_);
v_r_285_ = lean_box(v_res_284_);
return v_r_285_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__1___boxed(lean_object* v_x_286_, lean_object* v_x_287_){
_start:
{
uint8_t v_res_288_; lean_object* v_r_289_; 
v_res_288_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__1(v_x_286_, v_x_287_);
lean_dec(v_x_287_);
lean_dec(v_x_286_);
v_r_289_ = lean_box(v_res_288_);
return v_r_289_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqItems(lean_object* v_x_290_, lean_object* v_x_291_){
_start:
{
uint8_t v___x_292_; 
v___x_292_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_x_290_, v_x_291_);
return v___x_292_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqItems___boxed(lean_object* v_x_293_, lean_object* v_x_294_){
_start:
{
uint8_t v_res_295_; lean_object* v_r_296_; 
v_res_295_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems(v_x_293_, v_x_294_);
lean_dec(v_x_294_);
lean_dec(v_x_293_);
v_r_296_ = lean_box(v_res_295_);
return v_r_296_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(lean_object* v_x_297_, lean_object* v_x_298_){
_start:
{
if (lean_obj_tag(v_x_297_) == 0)
{
if (lean_obj_tag(v_x_298_) == 0)
{
uint8_t v___x_299_; 
v___x_299_ = 1;
return v___x_299_;
}
else
{
uint8_t v___x_300_; 
v___x_300_ = 0;
return v___x_300_;
}
}
else
{
lean_object* v_key_301_; lean_object* v_value_302_; lean_object* v_rest_303_; uint8_t v___x_304_; 
v_key_301_ = lean_ctor_get(v_x_297_, 0);
v_value_302_ = lean_ctor_get(v_x_297_, 1);
v_rest_303_ = lean_ctor_get(v_x_297_, 2);
v___x_304_ = 0;
if (lean_obj_tag(v_x_298_) == 0)
{
return v___x_304_;
}
else
{
lean_object* v_key_305_; lean_object* v_value_306_; lean_object* v_rest_307_; uint8_t v___x_308_; 
v_key_305_ = lean_ctor_get(v_x_298_, 0);
v_value_306_ = lean_ctor_get(v_x_298_, 1);
v_rest_307_ = lean_ctor_get(v_x_298_, 2);
v___x_308_ = lean_string_dec_eq(v_key_301_, v_key_305_);
if (v___x_308_ == 0)
{
return v___x_304_;
}
else
{
uint8_t v_inst_309_; 
v_inst_309_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__1(v_value_302_, v_value_306_);
if (v_inst_309_ == 0)
{
return v___x_304_;
}
else
{
uint8_t v_inst_310_; 
v_inst_310_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(v_rest_303_, v_rest_307_);
if (v_inst_310_ == 0)
{
return v___x_304_;
}
else
{
return v_inst_310_;
}
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__1(lean_object* v_x_311_, lean_object* v_x_312_){
_start:
{
switch(lean_obj_tag(v_x_311_))
{
case 0:
{
if (lean_obj_tag(v_x_312_) == 0)
{
uint8_t v___x_313_; 
v___x_313_ = 1;
return v___x_313_;
}
else
{
uint8_t v___x_314_; 
v___x_314_ = 0;
return v___x_314_;
}
}
case 1:
{
uint8_t v_value_315_; uint8_t v___x_316_; 
v_value_315_ = lean_ctor_get_uint8(v_x_311_, 0);
v___x_316_ = 0;
switch(lean_obj_tag(v_x_312_))
{
case 0:
{
return v___x_316_;
}
case 1:
{
if (v_value_315_ == 0)
{
uint8_t v_value_317_; 
v_value_317_ = lean_ctor_get_uint8(v_x_312_, 0);
if (v_value_317_ == 0)
{
uint8_t v___x_318_; 
v___x_318_ = 1;
return v___x_318_;
}
else
{
return v___x_316_;
}
}
else
{
uint8_t v_value_319_; 
v_value_319_ = lean_ctor_get_uint8(v_x_312_, 0);
if (v_value_319_ == 0)
{
return v___x_316_;
}
else
{
return v_value_319_;
}
}
}
default: 
{
return v___x_316_;
}
}
}
case 2:
{
uint64_t v_value_320_; uint8_t v___x_321_; 
v_value_320_ = lean_ctor_get_uint64(v_x_311_, 0);
v___x_321_ = 0;
switch(lean_obj_tag(v_x_312_))
{
case 0:
{
return v___x_321_;
}
case 2:
{
uint64_t v_value_322_; uint8_t v___x_323_; 
v_value_322_ = lean_ctor_get_uint64(v_x_312_, 0);
v___x_323_ = lean_uint64_dec_eq(v_value_320_, v_value_322_);
if (v___x_323_ == 0)
{
return v___x_321_;
}
else
{
return v___x_323_;
}
}
default: 
{
return v___x_321_;
}
}
}
case 3:
{
lean_object* v_value_324_; uint8_t v___x_325_; 
v_value_324_ = lean_ctor_get(v_x_311_, 0);
v___x_325_ = 0;
switch(lean_obj_tag(v_x_312_))
{
case 0:
{
return v___x_325_;
}
case 3:
{
lean_object* v_value_326_; uint8_t v___x_327_; 
v_value_326_ = lean_ctor_get(v_x_312_, 0);
v___x_327_ = lean_string_dec_eq(v_value_324_, v_value_326_);
if (v___x_327_ == 0)
{
return v___x_325_;
}
else
{
return v___x_327_;
}
}
default: 
{
return v___x_325_;
}
}
}
case 4:
{
lean_object* v_values_328_; uint8_t v___x_329_; 
v_values_328_ = lean_ctor_get(v_x_311_, 0);
v___x_329_ = 0;
switch(lean_obj_tag(v_x_312_))
{
case 0:
{
return v___x_329_;
}
case 4:
{
lean_object* v_values_330_; uint8_t v_inst_331_; 
v_values_330_ = lean_ctor_get(v_x_312_, 0);
v_inst_331_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__2(v_values_328_, v_values_330_);
if (v_inst_331_ == 0)
{
return v___x_329_;
}
else
{
return v_inst_331_;
}
}
default: 
{
return v___x_329_;
}
}
}
default: 
{
lean_object* v_fields_332_; uint8_t v___x_333_; 
v_fields_332_ = lean_ctor_get(v_x_311_, 0);
v___x_333_ = 0;
switch(lean_obj_tag(v_x_312_))
{
case 0:
{
return v___x_333_;
}
case 5:
{
lean_object* v_fields_334_; uint8_t v_inst_335_; 
v_fields_334_ = lean_ctor_get(v_x_312_, 0);
v_inst_335_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(v_fields_332_, v_fields_334_);
if (v_inst_335_ == 0)
{
return v___x_333_;
}
else
{
return v_inst_335_;
}
}
default: 
{
return v___x_333_;
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__2(lean_object* v_x_336_, lean_object* v_x_337_){
_start:
{
if (lean_obj_tag(v_x_336_) == 0)
{
if (lean_obj_tag(v_x_337_) == 0)
{
uint8_t v___x_338_; 
v___x_338_ = 1;
return v___x_338_;
}
else
{
uint8_t v___x_339_; 
v___x_339_ = 0;
return v___x_339_;
}
}
else
{
lean_object* v_value_340_; lean_object* v_rest_341_; uint8_t v___x_342_; 
v_value_340_ = lean_ctor_get(v_x_336_, 0);
v_rest_341_ = lean_ctor_get(v_x_336_, 1);
v___x_342_ = 0;
if (lean_obj_tag(v_x_337_) == 0)
{
return v___x_342_;
}
else
{
lean_object* v_value_343_; lean_object* v_rest_344_; uint8_t v_inst_345_; 
v_value_343_ = lean_ctor_get(v_x_337_, 0);
v_rest_344_ = lean_ctor_get(v_x_337_, 1);
v_inst_345_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__1(v_value_340_, v_value_343_);
if (v_inst_345_ == 0)
{
return v___x_342_;
}
else
{
uint8_t v_inst_346_; 
v_inst_346_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__2(v_rest_341_, v_rest_344_);
if (v_inst_346_ == 0)
{
return v___x_342_;
}
else
{
return v_inst_346_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__2___boxed(lean_object* v_x_347_, lean_object* v_x_348_){
_start:
{
uint8_t v_res_349_; lean_object* v_r_350_; 
v_res_349_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__2(v_x_347_, v_x_348_);
lean_dec(v_x_348_);
lean_dec(v_x_347_);
v_r_350_ = lean_box(v_res_349_);
return v_r_350_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3___boxed(lean_object* v_x_351_, lean_object* v_x_352_){
_start:
{
uint8_t v_res_353_; lean_object* v_r_354_; 
v_res_353_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(v_x_351_, v_x_352_);
lean_dec(v_x_352_);
lean_dec(v_x_351_);
v_r_354_ = lean_box(v_res_353_);
return v_r_354_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__1___boxed(lean_object* v_x_355_, lean_object* v_x_356_){
_start:
{
uint8_t v_res_357_; lean_object* v_r_358_; 
v_res_357_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__1(v_x_355_, v_x_356_);
lean_dec(v_x_356_);
lean_dec(v_x_355_);
v_r_358_ = lean_box(v_res_357_);
return v_r_358_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFields(lean_object* v_x_359_, lean_object* v_x_360_){
_start:
{
uint8_t v___x_361_; 
v___x_361_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(v_x_359_, v_x_360_);
return v___x_361_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFields___boxed(lean_object* v_x_362_, lean_object* v_x_363_){
_start:
{
uint8_t v_res_364_; lean_object* v_r_365_; 
v_res_364_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields(v_x_362_, v_x_363_);
lean_dec(v_x_363_);
lean_dec(v_x_362_);
v_r_365_ = lean_box(v_res_364_);
return v_r_365_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_normalizeItems(lean_object* v_x_366_){
_start:
{
if (lean_obj_tag(v_x_366_) == 0)
{
return v_x_366_;
}
else
{
lean_object* v_value_367_; lean_object* v_rest_368_; lean_object* v___x_370_; uint8_t v_isShared_371_; uint8_t v_isSharedCheck_377_; 
v_value_367_ = lean_ctor_get(v_x_366_, 0);
v_rest_368_ = lean_ctor_get(v_x_366_, 1);
v_isSharedCheck_377_ = !lean_is_exclusive(v_x_366_);
if (v_isSharedCheck_377_ == 0)
{
v___x_370_ = v_x_366_;
v_isShared_371_ = v_isSharedCheck_377_;
goto v_resetjp_369_;
}
else
{
lean_inc(v_rest_368_);
lean_inc(v_value_367_);
lean_dec(v_x_366_);
v___x_370_ = lean_box(0);
v_isShared_371_ = v_isSharedCheck_377_;
goto v_resetjp_369_;
}
v_resetjp_369_:
{
lean_object* v___x_372_; lean_object* v___x_373_; lean_object* v___x_375_; 
v___x_372_ = lp_algalVerification_Algal_Core_Json_normalizeNumbers(v_value_367_);
v___x_373_ = lp_algalVerification_Algal_Core_Json_normalizeItems(v_rest_368_);
if (v_isShared_371_ == 0)
{
lean_ctor_set(v___x_370_, 1, v___x_373_);
lean_ctor_set(v___x_370_, 0, v___x_372_);
v___x_375_ = v___x_370_;
goto v_reusejp_374_;
}
else
{
lean_object* v_reuseFailAlloc_376_; 
v_reuseFailAlloc_376_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_376_, 0, v___x_372_);
lean_ctor_set(v_reuseFailAlloc_376_, 1, v___x_373_);
v___x_375_ = v_reuseFailAlloc_376_;
goto v_reusejp_374_;
}
v_reusejp_374_:
{
return v___x_375_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_normalizeNumbers(lean_object* v_x_378_){
_start:
{
switch(lean_obj_tag(v_x_378_))
{
case 0:
{
return v_x_378_;
}
case 2:
{
uint64_t v_value_379_; lean_object* v___x_381_; uint8_t v_isShared_382_; uint8_t v_isSharedCheck_387_; 
v_value_379_ = lean_ctor_get_uint64(v_x_378_, 0);
v_isSharedCheck_387_ = !lean_is_exclusive(v_x_378_);
if (v_isSharedCheck_387_ == 0)
{
v___x_381_ = v_x_378_;
v_isShared_382_ = v_isSharedCheck_387_;
goto v_resetjp_380_;
}
else
{
lean_dec(v_x_378_);
v___x_381_ = lean_box(0);
v_isShared_382_ = v_isSharedCheck_387_;
goto v_resetjp_380_;
}
v_resetjp_380_:
{
uint64_t v___x_383_; lean_object* v___x_385_; 
v___x_383_ = lp_algalVerification_Algal_Core_Binary64_normalizeBits(v_value_379_);
if (v_isShared_382_ == 0)
{
v___x_385_ = v___x_381_;
goto v_reusejp_384_;
}
else
{
lean_object* v_reuseFailAlloc_386_; 
v_reuseFailAlloc_386_ = lean_alloc_ctor(2, 0, 8);
v___x_385_ = v_reuseFailAlloc_386_;
goto v_reusejp_384_;
}
v_reusejp_384_:
{
lean_ctor_set_uint64(v___x_385_, 0, v___x_383_);
return v___x_385_;
}
}
}
case 4:
{
lean_object* v_values_388_; lean_object* v___x_390_; uint8_t v_isShared_391_; uint8_t v_isSharedCheck_396_; 
v_values_388_ = lean_ctor_get(v_x_378_, 0);
v_isSharedCheck_396_ = !lean_is_exclusive(v_x_378_);
if (v_isSharedCheck_396_ == 0)
{
v___x_390_ = v_x_378_;
v_isShared_391_ = v_isSharedCheck_396_;
goto v_resetjp_389_;
}
else
{
lean_inc(v_values_388_);
lean_dec(v_x_378_);
v___x_390_ = lean_box(0);
v_isShared_391_ = v_isSharedCheck_396_;
goto v_resetjp_389_;
}
v_resetjp_389_:
{
lean_object* v___x_392_; lean_object* v___x_394_; 
v___x_392_ = lp_algalVerification_Algal_Core_Json_normalizeItems(v_values_388_);
if (v_isShared_391_ == 0)
{
lean_ctor_set(v___x_390_, 0, v___x_392_);
v___x_394_ = v___x_390_;
goto v_reusejp_393_;
}
else
{
lean_object* v_reuseFailAlloc_395_; 
v_reuseFailAlloc_395_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v_reuseFailAlloc_395_, 0, v___x_392_);
v___x_394_ = v_reuseFailAlloc_395_;
goto v_reusejp_393_;
}
v_reusejp_393_:
{
return v___x_394_;
}
}
}
case 5:
{
lean_object* v_fields_397_; lean_object* v___x_399_; uint8_t v_isShared_400_; uint8_t v_isSharedCheck_405_; 
v_fields_397_ = lean_ctor_get(v_x_378_, 0);
v_isSharedCheck_405_ = !lean_is_exclusive(v_x_378_);
if (v_isSharedCheck_405_ == 0)
{
v___x_399_ = v_x_378_;
v_isShared_400_ = v_isSharedCheck_405_;
goto v_resetjp_398_;
}
else
{
lean_inc(v_fields_397_);
lean_dec(v_x_378_);
v___x_399_ = lean_box(0);
v_isShared_400_ = v_isSharedCheck_405_;
goto v_resetjp_398_;
}
v_resetjp_398_:
{
lean_object* v___x_401_; lean_object* v___x_403_; 
v___x_401_ = lp_algalVerification_Algal_Core_Json_normalizeFields(v_fields_397_);
if (v_isShared_400_ == 0)
{
lean_ctor_set(v___x_399_, 0, v___x_401_);
v___x_403_ = v___x_399_;
goto v_reusejp_402_;
}
else
{
lean_object* v_reuseFailAlloc_404_; 
v_reuseFailAlloc_404_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v_reuseFailAlloc_404_, 0, v___x_401_);
v___x_403_ = v_reuseFailAlloc_404_;
goto v_reusejp_402_;
}
v_reusejp_402_:
{
return v___x_403_;
}
}
}
default: 
{
return v_x_378_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_normalizeFields(lean_object* v_x_406_){
_start:
{
if (lean_obj_tag(v_x_406_) == 0)
{
return v_x_406_;
}
else
{
lean_object* v_key_407_; lean_object* v_value_408_; lean_object* v_rest_409_; lean_object* v___x_411_; uint8_t v_isShared_412_; uint8_t v_isSharedCheck_418_; 
v_key_407_ = lean_ctor_get(v_x_406_, 0);
v_value_408_ = lean_ctor_get(v_x_406_, 1);
v_rest_409_ = lean_ctor_get(v_x_406_, 2);
v_isSharedCheck_418_ = !lean_is_exclusive(v_x_406_);
if (v_isSharedCheck_418_ == 0)
{
v___x_411_ = v_x_406_;
v_isShared_412_ = v_isSharedCheck_418_;
goto v_resetjp_410_;
}
else
{
lean_inc(v_rest_409_);
lean_inc(v_value_408_);
lean_inc(v_key_407_);
lean_dec(v_x_406_);
v___x_411_ = lean_box(0);
v_isShared_412_ = v_isSharedCheck_418_;
goto v_resetjp_410_;
}
v_resetjp_410_:
{
lean_object* v___x_413_; lean_object* v___x_414_; lean_object* v___x_416_; 
v___x_413_ = lp_algalVerification_Algal_Core_Json_normalizeNumbers(v_value_408_);
v___x_414_ = lp_algalVerification_Algal_Core_Json_normalizeFields(v_rest_409_);
if (v_isShared_412_ == 0)
{
lean_ctor_set(v___x_411_, 2, v___x_414_);
lean_ctor_set(v___x_411_, 1, v___x_413_);
v___x_416_ = v___x_411_;
goto v_reusejp_415_;
}
else
{
lean_object* v_reuseFailAlloc_417_; 
v_reuseFailAlloc_417_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v_reuseFailAlloc_417_, 0, v_key_407_);
lean_ctor_set(v_reuseFailAlloc_417_, 1, v___x_413_);
lean_ctor_set(v_reuseFailAlloc_417_, 2, v___x_414_);
v___x_416_ = v_reuseFailAlloc_417_;
goto v_reusejp_415_;
}
v_reusejp_415_:
{
return v___x_416_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeNumbers_match__1_splitter___redArg(lean_object* v_x_419_, lean_object* v_h__1_420_, lean_object* v_h__2_421_, lean_object* v_h__3_422_, lean_object* v_h__4_423_, lean_object* v_h__5_424_, lean_object* v_h__6_425_){
_start:
{
switch(lean_obj_tag(v_x_419_))
{
case 0:
{
lean_object* v___x_426_; lean_object* v___x_427_; 
lean_dec(v_h__6_425_);
lean_dec(v_h__5_424_);
lean_dec(v_h__4_423_);
lean_dec(v_h__3_422_);
lean_dec(v_h__2_421_);
v___x_426_ = lean_box(0);
v___x_427_ = lean_apply_1(v_h__1_420_, v___x_426_);
return v___x_427_;
}
case 1:
{
uint8_t v_value_428_; lean_object* v___x_429_; lean_object* v___x_430_; 
lean_dec(v_h__6_425_);
lean_dec(v_h__5_424_);
lean_dec(v_h__4_423_);
lean_dec(v_h__3_422_);
lean_dec(v_h__1_420_);
v_value_428_ = lean_ctor_get_uint8(v_x_419_, 0);
lean_dec_ref_known(v_x_419_, 0);
v___x_429_ = lean_box(v_value_428_);
v___x_430_ = lean_apply_1(v_h__2_421_, v___x_429_);
return v___x_430_;
}
case 2:
{
uint64_t v_value_431_; lean_object* v___x_432_; lean_object* v___x_433_; 
lean_dec(v_h__6_425_);
lean_dec(v_h__5_424_);
lean_dec(v_h__4_423_);
lean_dec(v_h__2_421_);
lean_dec(v_h__1_420_);
v_value_431_ = lean_ctor_get_uint64(v_x_419_, 0);
lean_dec_ref_known(v_x_419_, 0);
v___x_432_ = lean_box_uint64(v_value_431_);
v___x_433_ = lean_apply_1(v_h__3_422_, v___x_432_);
return v___x_433_;
}
case 3:
{
lean_object* v_value_434_; lean_object* v___x_435_; 
lean_dec(v_h__6_425_);
lean_dec(v_h__5_424_);
lean_dec(v_h__3_422_);
lean_dec(v_h__2_421_);
lean_dec(v_h__1_420_);
v_value_434_ = lean_ctor_get(v_x_419_, 0);
lean_inc_ref(v_value_434_);
lean_dec_ref_known(v_x_419_, 1);
v___x_435_ = lean_apply_1(v_h__4_423_, v_value_434_);
return v___x_435_;
}
case 4:
{
lean_object* v_values_436_; lean_object* v___x_437_; 
lean_dec(v_h__6_425_);
lean_dec(v_h__4_423_);
lean_dec(v_h__3_422_);
lean_dec(v_h__2_421_);
lean_dec(v_h__1_420_);
v_values_436_ = lean_ctor_get(v_x_419_, 0);
lean_inc(v_values_436_);
lean_dec_ref_known(v_x_419_, 1);
v___x_437_ = lean_apply_1(v_h__5_424_, v_values_436_);
return v___x_437_;
}
default: 
{
lean_object* v_fields_438_; lean_object* v___x_439_; 
lean_dec(v_h__5_424_);
lean_dec(v_h__4_423_);
lean_dec(v_h__3_422_);
lean_dec(v_h__2_421_);
lean_dec(v_h__1_420_);
v_fields_438_ = lean_ctor_get(v_x_419_, 0);
lean_inc(v_fields_438_);
lean_dec_ref_known(v_x_419_, 1);
v___x_439_ = lean_apply_1(v_h__6_425_, v_fields_438_);
return v___x_439_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeNumbers_match__1_splitter(lean_object* v_motive_440_, lean_object* v_x_441_, lean_object* v_h__1_442_, lean_object* v_h__2_443_, lean_object* v_h__3_444_, lean_object* v_h__4_445_, lean_object* v_h__5_446_, lean_object* v_h__6_447_){
_start:
{
switch(lean_obj_tag(v_x_441_))
{
case 0:
{
lean_object* v___x_448_; lean_object* v___x_449_; 
lean_dec(v_h__6_447_);
lean_dec(v_h__5_446_);
lean_dec(v_h__4_445_);
lean_dec(v_h__3_444_);
lean_dec(v_h__2_443_);
v___x_448_ = lean_box(0);
v___x_449_ = lean_apply_1(v_h__1_442_, v___x_448_);
return v___x_449_;
}
case 1:
{
uint8_t v_value_450_; lean_object* v___x_451_; lean_object* v___x_452_; 
lean_dec(v_h__6_447_);
lean_dec(v_h__5_446_);
lean_dec(v_h__4_445_);
lean_dec(v_h__3_444_);
lean_dec(v_h__1_442_);
v_value_450_ = lean_ctor_get_uint8(v_x_441_, 0);
lean_dec_ref_known(v_x_441_, 0);
v___x_451_ = lean_box(v_value_450_);
v___x_452_ = lean_apply_1(v_h__2_443_, v___x_451_);
return v___x_452_;
}
case 2:
{
uint64_t v_value_453_; lean_object* v___x_454_; lean_object* v___x_455_; 
lean_dec(v_h__6_447_);
lean_dec(v_h__5_446_);
lean_dec(v_h__4_445_);
lean_dec(v_h__2_443_);
lean_dec(v_h__1_442_);
v_value_453_ = lean_ctor_get_uint64(v_x_441_, 0);
lean_dec_ref_known(v_x_441_, 0);
v___x_454_ = lean_box_uint64(v_value_453_);
v___x_455_ = lean_apply_1(v_h__3_444_, v___x_454_);
return v___x_455_;
}
case 3:
{
lean_object* v_value_456_; lean_object* v___x_457_; 
lean_dec(v_h__6_447_);
lean_dec(v_h__5_446_);
lean_dec(v_h__3_444_);
lean_dec(v_h__2_443_);
lean_dec(v_h__1_442_);
v_value_456_ = lean_ctor_get(v_x_441_, 0);
lean_inc_ref(v_value_456_);
lean_dec_ref_known(v_x_441_, 1);
v___x_457_ = lean_apply_1(v_h__4_445_, v_value_456_);
return v___x_457_;
}
case 4:
{
lean_object* v_values_458_; lean_object* v___x_459_; 
lean_dec(v_h__6_447_);
lean_dec(v_h__4_445_);
lean_dec(v_h__3_444_);
lean_dec(v_h__2_443_);
lean_dec(v_h__1_442_);
v_values_458_ = lean_ctor_get(v_x_441_, 0);
lean_inc(v_values_458_);
lean_dec_ref_known(v_x_441_, 1);
v___x_459_ = lean_apply_1(v_h__5_446_, v_values_458_);
return v___x_459_;
}
default: 
{
lean_object* v_fields_460_; lean_object* v___x_461_; 
lean_dec(v_h__5_446_);
lean_dec(v_h__4_445_);
lean_dec(v_h__3_444_);
lean_dec(v_h__2_443_);
lean_dec(v_h__1_442_);
v_fields_460_ = lean_ctor_get(v_x_441_, 0);
lean_inc(v_fields_460_);
lean_dec_ref_known(v_x_441_, 1);
v___x_461_ = lean_apply_1(v_h__6_447_, v_fields_460_);
return v___x_461_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeItems_match__1_splitter___redArg(lean_object* v_x_462_, lean_object* v_h__1_463_, lean_object* v_h__2_464_){
_start:
{
if (lean_obj_tag(v_x_462_) == 0)
{
lean_object* v___x_465_; lean_object* v___x_466_; 
lean_dec(v_h__2_464_);
v___x_465_ = lean_box(0);
v___x_466_ = lean_apply_1(v_h__1_463_, v___x_465_);
return v___x_466_;
}
else
{
lean_object* v_value_467_; lean_object* v_rest_468_; lean_object* v___x_469_; 
lean_dec(v_h__1_463_);
v_value_467_ = lean_ctor_get(v_x_462_, 0);
lean_inc(v_value_467_);
v_rest_468_ = lean_ctor_get(v_x_462_, 1);
lean_inc(v_rest_468_);
lean_dec_ref_known(v_x_462_, 2);
v___x_469_ = lean_apply_2(v_h__2_464_, v_value_467_, v_rest_468_);
return v___x_469_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeItems_match__1_splitter(lean_object* v_motive_470_, lean_object* v_x_471_, lean_object* v_h__1_472_, lean_object* v_h__2_473_){
_start:
{
if (lean_obj_tag(v_x_471_) == 0)
{
lean_object* v___x_474_; lean_object* v___x_475_; 
lean_dec(v_h__2_473_);
v___x_474_ = lean_box(0);
v___x_475_ = lean_apply_1(v_h__1_472_, v___x_474_);
return v___x_475_;
}
else
{
lean_object* v_value_476_; lean_object* v_rest_477_; lean_object* v___x_478_; 
lean_dec(v_h__1_472_);
v_value_476_ = lean_ctor_get(v_x_471_, 0);
lean_inc(v_value_476_);
v_rest_477_ = lean_ctor_get(v_x_471_, 1);
lean_inc(v_rest_477_);
lean_dec_ref_known(v_x_471_, 2);
v___x_478_ = lean_apply_2(v_h__2_473_, v_value_476_, v_rest_477_);
return v___x_478_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeFields_match__1_splitter___redArg(lean_object* v_x_479_, lean_object* v_h__1_480_, lean_object* v_h__2_481_){
_start:
{
if (lean_obj_tag(v_x_479_) == 0)
{
lean_object* v___x_482_; lean_object* v___x_483_; 
lean_dec(v_h__2_481_);
v___x_482_ = lean_box(0);
v___x_483_ = lean_apply_1(v_h__1_480_, v___x_482_);
return v___x_483_;
}
else
{
lean_object* v_key_484_; lean_object* v_value_485_; lean_object* v_rest_486_; lean_object* v___x_487_; 
lean_dec(v_h__1_480_);
v_key_484_ = lean_ctor_get(v_x_479_, 0);
lean_inc_ref(v_key_484_);
v_value_485_ = lean_ctor_get(v_x_479_, 1);
lean_inc(v_value_485_);
v_rest_486_ = lean_ctor_get(v_x_479_, 2);
lean_inc(v_rest_486_);
lean_dec_ref_known(v_x_479_, 3);
v___x_487_ = lean_apply_3(v_h__2_481_, v_key_484_, v_value_485_, v_rest_486_);
return v___x_487_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_normalizeFields_match__1_splitter(lean_object* v_motive_488_, lean_object* v_x_489_, lean_object* v_h__1_490_, lean_object* v_h__2_491_){
_start:
{
if (lean_obj_tag(v_x_489_) == 0)
{
lean_object* v___x_492_; lean_object* v___x_493_; 
lean_dec(v_h__2_491_);
v___x_492_ = lean_box(0);
v___x_493_ = lean_apply_1(v_h__1_490_, v___x_492_);
return v___x_493_;
}
else
{
lean_object* v_key_494_; lean_object* v_value_495_; lean_object* v_rest_496_; lean_object* v___x_497_; 
lean_dec(v_h__1_490_);
v_key_494_ = lean_ctor_get(v_x_489_, 0);
lean_inc_ref(v_key_494_);
v_value_495_ = lean_ctor_get(v_x_489_, 1);
lean_inc(v_value_495_);
v_rest_496_ = lean_ctor_get(v_x_489_, 2);
lean_inc(v_rest_496_);
lean_dec_ref_known(v_x_489_, 3);
v___x_497_ = lean_apply_3(v_h__2_491_, v_key_494_, v_value_495_, v_rest_496_);
return v___x_497_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorIdx(lean_object* v_x_498_){
_start:
{
switch(lean_obj_tag(v_x_498_))
{
case 0:
{
lean_object* v___x_499_; 
v___x_499_ = lean_unsigned_to_nat(0u);
return v___x_499_;
}
case 1:
{
lean_object* v___x_500_; 
v___x_500_ = lean_unsigned_to_nat(1u);
return v___x_500_;
}
case 2:
{
lean_object* v___x_501_; 
v___x_501_ = lean_unsigned_to_nat(2u);
return v___x_501_;
}
case 3:
{
lean_object* v___x_502_; 
v___x_502_ = lean_unsigned_to_nat(3u);
return v___x_502_;
}
case 4:
{
lean_object* v___x_503_; 
v___x_503_ = lean_unsigned_to_nat(4u);
return v___x_503_;
}
case 5:
{
lean_object* v___x_504_; 
v___x_504_ = lean_unsigned_to_nat(5u);
return v___x_504_;
}
case 6:
{
lean_object* v___x_505_; 
v___x_505_ = lean_unsigned_to_nat(6u);
return v___x_505_;
}
case 7:
{
lean_object* v___x_506_; 
v___x_506_ = lean_unsigned_to_nat(7u);
return v___x_506_;
}
case 8:
{
lean_object* v___x_507_; 
v___x_507_ = lean_unsigned_to_nat(8u);
return v___x_507_;
}
default: 
{
lean_object* v___x_508_; 
v___x_508_ = lean_unsigned_to_nat(9u);
return v___x_508_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorIdx___boxed(lean_object* v_x_509_){
_start:
{
lean_object* v_res_510_; 
v_res_510_ = lp_algalVerification_Algal_Core_Json_Token_ctorIdx(v_x_509_);
lean_dec(v_x_509_);
return v_res_510_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(lean_object* v_t_511_, lean_object* v_k_512_){
_start:
{
switch(lean_obj_tag(v_t_511_))
{
case 1:
{
uint8_t v_value_513_; lean_object* v___x_514_; lean_object* v___x_515_; 
v_value_513_ = lean_ctor_get_uint8(v_t_511_, 0);
lean_dec_ref_known(v_t_511_, 0);
v___x_514_ = lean_box(v_value_513_);
v___x_515_ = lean_apply_1(v_k_512_, v___x_514_);
return v___x_515_;
}
case 2:
{
uint64_t v_bits_516_; lean_object* v___x_517_; lean_object* v___x_518_; 
v_bits_516_ = lean_ctor_get_uint64(v_t_511_, 0);
lean_dec_ref_known(v_t_511_, 0);
v___x_517_ = lean_box_uint64(v_bits_516_);
v___x_518_ = lean_apply_1(v_k_512_, v___x_517_);
return v___x_518_;
}
case 3:
{
lean_object* v_value_519_; lean_object* v___x_520_; 
v_value_519_ = lean_ctor_get(v_t_511_, 0);
lean_inc_ref(v_value_519_);
lean_dec_ref_known(v_t_511_, 1);
v___x_520_ = lean_apply_1(v_k_512_, v_value_519_);
return v___x_520_;
}
case 8:
{
lean_object* v_key_521_; lean_object* v___x_522_; 
v_key_521_ = lean_ctor_get(v_t_511_, 0);
lean_inc_ref(v_key_521_);
lean_dec_ref_known(v_t_511_, 1);
v___x_522_ = lean_apply_1(v_k_512_, v_key_521_);
return v___x_522_;
}
default: 
{
lean_dec(v_t_511_);
return v_k_512_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorElim(lean_object* v_motive_523_, lean_object* v_ctorIdx_524_, lean_object* v_t_525_, lean_object* v_h_526_, lean_object* v_k_527_){
_start:
{
lean_object* v___x_528_; 
v___x_528_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_525_, v_k_527_);
return v___x_528_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_ctorElim___boxed(lean_object* v_motive_529_, lean_object* v_ctorIdx_530_, lean_object* v_t_531_, lean_object* v_h_532_, lean_object* v_k_533_){
_start:
{
lean_object* v_res_534_; 
v_res_534_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim(v_motive_529_, v_ctorIdx_530_, v_t_531_, v_h_532_, v_k_533_);
lean_dec(v_ctorIdx_530_);
return v_res_534_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_null_elim___redArg(lean_object* v_t_535_, lean_object* v_null_536_){
_start:
{
lean_object* v___x_537_; 
v___x_537_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_535_, v_null_536_);
return v___x_537_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_null_elim(lean_object* v_motive_538_, lean_object* v_t_539_, lean_object* v_h_540_, lean_object* v_null_541_){
_start:
{
lean_object* v___x_542_; 
v___x_542_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_539_, v_null_541_);
return v___x_542_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_bool_elim___redArg(lean_object* v_t_543_, lean_object* v_bool_544_){
_start:
{
lean_object* v___x_545_; 
v___x_545_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_543_, v_bool_544_);
return v___x_545_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_bool_elim(lean_object* v_motive_546_, lean_object* v_t_547_, lean_object* v_h_548_, lean_object* v_bool_549_){
_start:
{
lean_object* v___x_550_; 
v___x_550_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_547_, v_bool_549_);
return v___x_550_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_number_elim___redArg(lean_object* v_t_551_, lean_object* v_number_552_){
_start:
{
lean_object* v___x_553_; 
v___x_553_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_551_, v_number_552_);
return v___x_553_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_number_elim(lean_object* v_motive_554_, lean_object* v_t_555_, lean_object* v_h_556_, lean_object* v_number_557_){
_start:
{
lean_object* v___x_558_; 
v___x_558_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_555_, v_number_557_);
return v___x_558_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_text_elim___redArg(lean_object* v_t_559_, lean_object* v_text_560_){
_start:
{
lean_object* v___x_561_; 
v___x_561_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_559_, v_text_560_);
return v___x_561_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_text_elim(lean_object* v_motive_562_, lean_object* v_t_563_, lean_object* v_h_564_, lean_object* v_text_565_){
_start:
{
lean_object* v___x_566_; 
v___x_566_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_563_, v_text_565_);
return v___x_566_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilItems_elim___redArg(lean_object* v_t_567_, lean_object* v_nilItems_568_){
_start:
{
lean_object* v___x_569_; 
v___x_569_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_567_, v_nilItems_568_);
return v___x_569_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilItems_elim(lean_object* v_motive_570_, lean_object* v_t_571_, lean_object* v_h_572_, lean_object* v_nilItems_573_){
_start:
{
lean_object* v___x_574_; 
v___x_574_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_571_, v_nilItems_573_);
return v___x_574_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consItems_elim___redArg(lean_object* v_t_575_, lean_object* v_consItems_576_){
_start:
{
lean_object* v___x_577_; 
v___x_577_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_575_, v_consItems_576_);
return v___x_577_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consItems_elim(lean_object* v_motive_578_, lean_object* v_t_579_, lean_object* v_h_580_, lean_object* v_consItems_581_){
_start:
{
lean_object* v___x_582_; 
v___x_582_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_579_, v_consItems_581_);
return v___x_582_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_array_elim___redArg(lean_object* v_t_583_, lean_object* v_array_584_){
_start:
{
lean_object* v___x_585_; 
v___x_585_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_583_, v_array_584_);
return v___x_585_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_array_elim(lean_object* v_motive_586_, lean_object* v_t_587_, lean_object* v_h_588_, lean_object* v_array_589_){
_start:
{
lean_object* v___x_590_; 
v___x_590_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_587_, v_array_589_);
return v___x_590_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilFields_elim___redArg(lean_object* v_t_591_, lean_object* v_nilFields_592_){
_start:
{
lean_object* v___x_593_; 
v___x_593_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_591_, v_nilFields_592_);
return v___x_593_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_nilFields_elim(lean_object* v_motive_594_, lean_object* v_t_595_, lean_object* v_h_596_, lean_object* v_nilFields_597_){
_start:
{
lean_object* v___x_598_; 
v___x_598_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_595_, v_nilFields_597_);
return v___x_598_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consFields_elim___redArg(lean_object* v_t_599_, lean_object* v_consFields_600_){
_start:
{
lean_object* v___x_601_; 
v___x_601_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_599_, v_consFields_600_);
return v___x_601_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_consFields_elim(lean_object* v_motive_602_, lean_object* v_t_603_, lean_object* v_h_604_, lean_object* v_consFields_605_){
_start:
{
lean_object* v___x_606_; 
v___x_606_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_603_, v_consFields_605_);
return v___x_606_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_object_elim___redArg(lean_object* v_t_607_, lean_object* v_object_608_){
_start:
{
lean_object* v___x_609_; 
v___x_609_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_607_, v_object_608_);
return v___x_609_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Token_object_elim(lean_object* v_motive_610_, lean_object* v_t_611_, lean_object* v_h_612_, lean_object* v_object_613_){
_start:
{
lean_object* v___x_614_; 
v___x_614_ = lp_algalVerification_Algal_Core_Json_Token_ctorElim___redArg(v_t_611_, v_object_613_);
return v___x_614_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqToken_decEq(lean_object* v_x_615_, lean_object* v_x_616_){
_start:
{
lean_object* v___x_617_; lean_object* v___x_618_; uint8_t v___x_619_; 
v___x_617_ = lp_algalVerification_Algal_Core_Json_Token_ctorIdx(v_x_615_);
v___x_618_ = lp_algalVerification_Algal_Core_Json_Token_ctorIdx(v_x_616_);
v___x_619_ = lean_nat_dec_eq(v___x_617_, v___x_618_);
lean_dec(v___x_618_);
lean_dec(v___x_617_);
if (v___x_619_ == 0)
{
return v___x_619_;
}
else
{
switch(lean_obj_tag(v_x_615_))
{
case 1:
{
uint8_t v_value_620_; 
v_value_620_ = lean_ctor_get_uint8(v_x_615_, 0);
if (v_value_620_ == 0)
{
uint8_t v_value_621_; 
v_value_621_ = lean_ctor_get_uint8(v_x_616_, 0);
if (v_value_621_ == 0)
{
return v___x_619_;
}
else
{
return v_value_620_;
}
}
else
{
uint8_t v_value_622_; 
v_value_622_ = lean_ctor_get_uint8(v_x_616_, 0);
return v_value_622_;
}
}
case 2:
{
uint64_t v_bits_623_; uint64_t v_bits_624_; uint8_t v___x_625_; 
v_bits_623_ = lean_ctor_get_uint64(v_x_615_, 0);
v_bits_624_ = lean_ctor_get_uint64(v_x_616_, 0);
v___x_625_ = lean_uint64_dec_eq(v_bits_623_, v_bits_624_);
return v___x_625_;
}
case 3:
{
lean_object* v_value_626_; lean_object* v_value_627_; uint8_t v___x_628_; 
v_value_626_ = lean_ctor_get(v_x_615_, 0);
v_value_627_ = lean_ctor_get(v_x_616_, 0);
v___x_628_ = lean_string_dec_eq(v_value_626_, v_value_627_);
return v___x_628_;
}
case 8:
{
lean_object* v_key_629_; lean_object* v_key_630_; uint8_t v___x_631_; 
v_key_629_ = lean_ctor_get(v_x_615_, 0);
v_key_630_ = lean_ctor_get(v_x_616_, 0);
v___x_631_ = lean_string_dec_eq(v_key_629_, v_key_630_);
return v___x_631_;
}
default: 
{
return v___x_619_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqToken_decEq___boxed(lean_object* v_x_632_, lean_object* v_x_633_){
_start:
{
uint8_t v_res_634_; lean_object* v_r_635_; 
v_res_634_ = lp_algalVerification_Algal_Core_Json_instDecidableEqToken_decEq(v_x_632_, v_x_633_);
lean_dec(v_x_633_);
lean_dec(v_x_632_);
v_r_635_ = lean_box(v_res_634_);
return v_r_635_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqToken(lean_object* v_x_636_, lean_object* v_x_637_){
_start:
{
uint8_t v___x_638_; 
v___x_638_ = lp_algalVerification_Algal_Core_Json_instDecidableEqToken_decEq(v_x_636_, v_x_637_);
return v___x_638_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqToken___boxed(lean_object* v_x_639_, lean_object* v_x_640_){
_start:
{
uint8_t v_res_641_; lean_object* v_r_642_; 
v_res_641_ = lp_algalVerification_Algal_Core_Json_instDecidableEqToken(v_x_639_, v_x_640_);
lean_dec(v_x_640_);
lean_dec(v_x_639_);
v_r_642_ = lean_box(v_res_641_);
return v_r_642_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorIdx(lean_object* v_x_643_){
_start:
{
switch(lean_obj_tag(v_x_643_))
{
case 0:
{
lean_object* v___x_644_; 
v___x_644_ = lean_unsigned_to_nat(0u);
return v___x_644_;
}
case 1:
{
lean_object* v___x_645_; 
v___x_645_ = lean_unsigned_to_nat(1u);
return v___x_645_;
}
default: 
{
lean_object* v___x_646_; 
v___x_646_ = lean_unsigned_to_nat(2u);
return v___x_646_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorIdx___boxed(lean_object* v_x_647_){
_start:
{
lean_object* v_res_648_; 
v_res_648_ = lp_algalVerification_Algal_Core_Json_Frame_ctorIdx(v_x_647_);
lean_dec_ref(v_x_647_);
return v_res_648_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(lean_object* v_t_649_, lean_object* v_k_650_){
_start:
{
lean_object* v_value_651_; lean_object* v___x_652_; 
v_value_651_ = lean_ctor_get(v_t_649_, 0);
lean_inc(v_value_651_);
lean_dec_ref(v_t_649_);
v___x_652_ = lean_apply_1(v_k_650_, v_value_651_);
return v___x_652_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorElim(lean_object* v_motive_653_, lean_object* v_ctorIdx_654_, lean_object* v_t_655_, lean_object* v_h_656_, lean_object* v_k_657_){
_start:
{
lean_object* v___x_658_; 
v___x_658_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(v_t_655_, v_k_657_);
return v___x_658_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_ctorElim___boxed(lean_object* v_motive_659_, lean_object* v_ctorIdx_660_, lean_object* v_t_661_, lean_object* v_h_662_, lean_object* v_k_663_){
_start:
{
lean_object* v_res_664_; 
v_res_664_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim(v_motive_659_, v_ctorIdx_660_, v_t_661_, v_h_662_, v_k_663_);
lean_dec(v_ctorIdx_660_);
return v_res_664_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_value_elim___redArg(lean_object* v_t_665_, lean_object* v_value_666_){
_start:
{
lean_object* v___x_667_; 
v___x_667_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(v_t_665_, v_value_666_);
return v___x_667_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_value_elim(lean_object* v_motive_668_, lean_object* v_t_669_, lean_object* v_h_670_, lean_object* v_value_671_){
_start:
{
lean_object* v___x_672_; 
v___x_672_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(v_t_669_, v_value_671_);
return v___x_672_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_items_elim___redArg(lean_object* v_t_673_, lean_object* v_items_674_){
_start:
{
lean_object* v___x_675_; 
v___x_675_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(v_t_673_, v_items_674_);
return v___x_675_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_items_elim(lean_object* v_motive_676_, lean_object* v_t_677_, lean_object* v_h_678_, lean_object* v_items_679_){
_start:
{
lean_object* v___x_680_; 
v___x_680_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(v_t_677_, v_items_679_);
return v___x_680_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_fields_elim___redArg(lean_object* v_t_681_, lean_object* v_fields_682_){
_start:
{
lean_object* v___x_683_; 
v___x_683_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(v_t_681_, v_fields_682_);
return v___x_683_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_Frame_fields_elim(lean_object* v_motive_684_, lean_object* v_t_685_, lean_object* v_h_686_, lean_object* v_fields_687_){
_start:
{
lean_object* v___x_688_; 
v___x_688_ = lp_algalVerification_Algal_Core_Json_Frame_ctorElim___redArg(v_t_685_, v_fields_687_);
return v___x_688_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFrame_decEq(lean_object* v_x_689_, lean_object* v_x_690_){
_start:
{
switch(lean_obj_tag(v_x_689_))
{
case 0:
{
if (lean_obj_tag(v_x_690_) == 0)
{
lean_object* v_value_691_; lean_object* v_value_692_; uint8_t v___x_693_; 
v_value_691_ = lean_ctor_get(v_x_689_, 0);
v_value_692_ = lean_ctor_get(v_x_690_, 0);
v___x_693_ = lp_algalVerification_Algal_Core_Json_instDecidableEqValue_decEq__1(v_value_691_, v_value_692_);
return v___x_693_;
}
else
{
uint8_t v___x_694_; 
v___x_694_ = 0;
return v___x_694_;
}
}
case 1:
{
if (lean_obj_tag(v_x_690_) == 1)
{
lean_object* v_items_695_; lean_object* v_items_696_; uint8_t v___x_697_; 
v_items_695_ = lean_ctor_get(v_x_689_, 0);
v_items_696_ = lean_ctor_get(v_x_690_, 0);
v___x_697_ = lp_algalVerification_Algal_Core_Json_instDecidableEqItems_decEq__2(v_items_695_, v_items_696_);
return v___x_697_;
}
else
{
uint8_t v___x_698_; 
v___x_698_ = 0;
return v___x_698_;
}
}
default: 
{
if (lean_obj_tag(v_x_690_) == 2)
{
lean_object* v_fields_699_; lean_object* v_fields_700_; uint8_t v___x_701_; 
v_fields_699_ = lean_ctor_get(v_x_689_, 0);
v_fields_700_ = lean_ctor_get(v_x_690_, 0);
v___x_701_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFields_decEq__3(v_fields_699_, v_fields_700_);
return v___x_701_;
}
else
{
uint8_t v___x_702_; 
v___x_702_ = 0;
return v___x_702_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFrame_decEq___boxed(lean_object* v_x_703_, lean_object* v_x_704_){
_start:
{
uint8_t v_res_705_; lean_object* v_r_706_; 
v_res_705_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFrame_decEq(v_x_703_, v_x_704_);
lean_dec_ref(v_x_704_);
lean_dec_ref(v_x_703_);
v_r_706_ = lean_box(v_res_705_);
return v_r_706_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Json_instDecidableEqFrame(lean_object* v_x_707_, lean_object* v_x_708_){
_start:
{
uint8_t v___x_709_; 
v___x_709_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFrame_decEq(v_x_707_, v_x_708_);
return v___x_709_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_instDecidableEqFrame___boxed(lean_object* v_x_710_, lean_object* v_x_711_){
_start:
{
uint8_t v_res_712_; lean_object* v_r_713_; 
v_res_712_ = lp_algalVerification_Algal_Core_Json_instDecidableEqFrame(v_x_710_, v_x_711_);
lean_dec_ref(v_x_711_);
lean_dec_ref(v_x_710_);
v_r_713_ = lean_box(v_res_712_);
return v_r_713_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_step(lean_object* v_stack_720_, lean_object* v_x_721_){
_start:
{
switch(lean_obj_tag(v_x_721_))
{
case 0:
{
lean_object* v___x_722_; lean_object* v___x_723_; lean_object* v___x_724_; 
v___x_722_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_step___closed__0));
v___x_723_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_723_, 0, v___x_722_);
lean_ctor_set(v___x_723_, 1, v_stack_720_);
v___x_724_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_724_, 0, v___x_723_);
return v___x_724_;
}
case 1:
{
uint8_t v_value_725_; lean_object* v___x_727_; uint8_t v_isShared_728_; uint8_t v_isSharedCheck_735_; 
v_value_725_ = lean_ctor_get_uint8(v_x_721_, 0);
v_isSharedCheck_735_ = !lean_is_exclusive(v_x_721_);
if (v_isSharedCheck_735_ == 0)
{
v___x_727_ = v_x_721_;
v_isShared_728_ = v_isSharedCheck_735_;
goto v_resetjp_726_;
}
else
{
lean_dec(v_x_721_);
v___x_727_ = lean_box(0);
v_isShared_728_ = v_isSharedCheck_735_;
goto v_resetjp_726_;
}
v_resetjp_726_:
{
lean_object* v___x_730_; 
if (v_isShared_728_ == 0)
{
v___x_730_ = v___x_727_;
goto v_reusejp_729_;
}
else
{
lean_object* v_reuseFailAlloc_734_; 
v_reuseFailAlloc_734_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_734_, 0, v_value_725_);
v___x_730_ = v_reuseFailAlloc_734_;
goto v_reusejp_729_;
}
v_reusejp_729_:
{
lean_object* v___x_731_; lean_object* v___x_732_; lean_object* v___x_733_; 
v___x_731_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_731_, 0, v___x_730_);
v___x_732_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_732_, 0, v___x_731_);
lean_ctor_set(v___x_732_, 1, v_stack_720_);
v___x_733_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_733_, 0, v___x_732_);
return v___x_733_;
}
}
}
case 2:
{
uint64_t v_bits_736_; lean_object* v___x_738_; uint8_t v_isShared_739_; uint8_t v_isSharedCheck_756_; 
v_bits_736_ = lean_ctor_get_uint64(v_x_721_, 0);
v_isSharedCheck_756_ = !lean_is_exclusive(v_x_721_);
if (v_isSharedCheck_756_ == 0)
{
v___x_738_ = v_x_721_;
v_isShared_739_ = v_isSharedCheck_756_;
goto v_resetjp_737_;
}
else
{
lean_dec(v_x_721_);
v___x_738_ = lean_box(0);
v_isShared_739_ = v_isSharedCheck_756_;
goto v_resetjp_737_;
}
v_resetjp_737_:
{
lean_object* v___x_740_; 
v___x_740_ = lp_algalVerification_Algal_Core_Binary64_admit(v_bits_736_);
if (lean_obj_tag(v___x_740_) == 0)
{
lean_object* v___x_741_; 
lean_del_object(v___x_738_);
lean_dec(v_stack_720_);
v___x_741_ = lean_box(0);
return v___x_741_;
}
else
{
lean_object* v_val_742_; lean_object* v___x_744_; uint8_t v_isShared_745_; uint8_t v_isSharedCheck_755_; 
v_val_742_ = lean_ctor_get(v___x_740_, 0);
v_isSharedCheck_755_ = !lean_is_exclusive(v___x_740_);
if (v_isSharedCheck_755_ == 0)
{
v___x_744_ = v___x_740_;
v_isShared_745_ = v_isSharedCheck_755_;
goto v_resetjp_743_;
}
else
{
lean_inc(v_val_742_);
lean_dec(v___x_740_);
v___x_744_ = lean_box(0);
v_isShared_745_ = v_isSharedCheck_755_;
goto v_resetjp_743_;
}
v_resetjp_743_:
{
lean_object* v___x_747_; 
if (v_isShared_739_ == 0)
{
v___x_747_ = v___x_738_;
goto v_reusejp_746_;
}
else
{
lean_object* v_reuseFailAlloc_754_; 
v_reuseFailAlloc_754_ = lean_alloc_ctor(2, 0, 8);
v___x_747_ = v_reuseFailAlloc_754_;
goto v_reusejp_746_;
}
v_reusejp_746_:
{
uint64_t v___x_748_; lean_object* v___x_749_; lean_object* v___x_750_; lean_object* v___x_752_; 
v___x_748_ = lean_unbox_uint64(v_val_742_);
lean_dec(v_val_742_);
lean_ctor_set_uint64(v___x_747_, 0, v___x_748_);
v___x_749_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_749_, 0, v___x_747_);
v___x_750_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_750_, 0, v___x_749_);
lean_ctor_set(v___x_750_, 1, v_stack_720_);
if (v_isShared_745_ == 0)
{
lean_ctor_set(v___x_744_, 0, v___x_750_);
v___x_752_ = v___x_744_;
goto v_reusejp_751_;
}
else
{
lean_object* v_reuseFailAlloc_753_; 
v_reuseFailAlloc_753_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_753_, 0, v___x_750_);
v___x_752_ = v_reuseFailAlloc_753_;
goto v_reusejp_751_;
}
v_reusejp_751_:
{
return v___x_752_;
}
}
}
}
}
}
case 3:
{
lean_object* v_value_757_; lean_object* v___x_759_; uint8_t v_isShared_760_; uint8_t v_isSharedCheck_767_; 
v_value_757_ = lean_ctor_get(v_x_721_, 0);
v_isSharedCheck_767_ = !lean_is_exclusive(v_x_721_);
if (v_isSharedCheck_767_ == 0)
{
v___x_759_ = v_x_721_;
v_isShared_760_ = v_isSharedCheck_767_;
goto v_resetjp_758_;
}
else
{
lean_inc(v_value_757_);
lean_dec(v_x_721_);
v___x_759_ = lean_box(0);
v_isShared_760_ = v_isSharedCheck_767_;
goto v_resetjp_758_;
}
v_resetjp_758_:
{
lean_object* v___x_762_; 
if (v_isShared_760_ == 0)
{
v___x_762_ = v___x_759_;
goto v_reusejp_761_;
}
else
{
lean_object* v_reuseFailAlloc_766_; 
v_reuseFailAlloc_766_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_766_, 0, v_value_757_);
v___x_762_ = v_reuseFailAlloc_766_;
goto v_reusejp_761_;
}
v_reusejp_761_:
{
lean_object* v___x_763_; lean_object* v___x_764_; lean_object* v___x_765_; 
v___x_763_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v___x_763_, 0, v___x_762_);
v___x_764_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_764_, 0, v___x_763_);
lean_ctor_set(v___x_764_, 1, v_stack_720_);
v___x_765_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_765_, 0, v___x_764_);
return v___x_765_;
}
}
}
case 4:
{
lean_object* v___x_768_; lean_object* v___x_769_; lean_object* v___x_770_; 
v___x_768_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_step___closed__1));
v___x_769_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_769_, 0, v___x_768_);
lean_ctor_set(v___x_769_, 1, v_stack_720_);
v___x_770_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_770_, 0, v___x_769_);
return v___x_770_;
}
case 5:
{
if (lean_obj_tag(v_stack_720_) == 1)
{
lean_object* v_head_771_; 
v_head_771_ = lean_ctor_get(v_stack_720_, 0);
lean_inc(v_head_771_);
if (lean_obj_tag(v_head_771_) == 1)
{
lean_object* v_tail_772_; 
v_tail_772_ = lean_ctor_get(v_stack_720_, 1);
lean_inc(v_tail_772_);
lean_dec_ref_known(v_stack_720_, 2);
if (lean_obj_tag(v_tail_772_) == 1)
{
lean_object* v_head_773_; 
v_head_773_ = lean_ctor_get(v_tail_772_, 0);
lean_inc(v_head_773_);
if (lean_obj_tag(v_head_773_) == 0)
{
lean_object* v_items_774_; lean_object* v___x_776_; uint8_t v_isShared_777_; uint8_t v_isSharedCheck_799_; 
v_items_774_ = lean_ctor_get(v_head_771_, 0);
v_isSharedCheck_799_ = !lean_is_exclusive(v_head_771_);
if (v_isSharedCheck_799_ == 0)
{
v___x_776_ = v_head_771_;
v_isShared_777_ = v_isSharedCheck_799_;
goto v_resetjp_775_;
}
else
{
lean_inc(v_items_774_);
lean_dec(v_head_771_);
v___x_776_ = lean_box(0);
v_isShared_777_ = v_isSharedCheck_799_;
goto v_resetjp_775_;
}
v_resetjp_775_:
{
lean_object* v_tail_778_; lean_object* v___x_780_; uint8_t v_isShared_781_; uint8_t v_isSharedCheck_797_; 
v_tail_778_ = lean_ctor_get(v_tail_772_, 1);
v_isSharedCheck_797_ = !lean_is_exclusive(v_tail_772_);
if (v_isSharedCheck_797_ == 0)
{
lean_object* v_unused_798_; 
v_unused_798_ = lean_ctor_get(v_tail_772_, 0);
lean_dec(v_unused_798_);
v___x_780_ = v_tail_772_;
v_isShared_781_ = v_isSharedCheck_797_;
goto v_resetjp_779_;
}
else
{
lean_inc(v_tail_778_);
lean_dec(v_tail_772_);
v___x_780_ = lean_box(0);
v_isShared_781_ = v_isSharedCheck_797_;
goto v_resetjp_779_;
}
v_resetjp_779_:
{
lean_object* v_value_782_; lean_object* v___x_784_; uint8_t v_isShared_785_; uint8_t v_isSharedCheck_796_; 
v_value_782_ = lean_ctor_get(v_head_773_, 0);
v_isSharedCheck_796_ = !lean_is_exclusive(v_head_773_);
if (v_isSharedCheck_796_ == 0)
{
v___x_784_ = v_head_773_;
v_isShared_785_ = v_isSharedCheck_796_;
goto v_resetjp_783_;
}
else
{
lean_inc(v_value_782_);
lean_dec(v_head_773_);
v___x_784_ = lean_box(0);
v_isShared_785_ = v_isSharedCheck_796_;
goto v_resetjp_783_;
}
v_resetjp_783_:
{
lean_object* v___x_786_; lean_object* v___x_788_; 
v___x_786_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_786_, 0, v_value_782_);
lean_ctor_set(v___x_786_, 1, v_items_774_);
if (v_isShared_785_ == 0)
{
lean_ctor_set_tag(v___x_784_, 1);
lean_ctor_set(v___x_784_, 0, v___x_786_);
v___x_788_ = v___x_784_;
goto v_reusejp_787_;
}
else
{
lean_object* v_reuseFailAlloc_795_; 
v_reuseFailAlloc_795_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_795_, 0, v___x_786_);
v___x_788_ = v_reuseFailAlloc_795_;
goto v_reusejp_787_;
}
v_reusejp_787_:
{
lean_object* v___x_790_; 
if (v_isShared_781_ == 0)
{
lean_ctor_set(v___x_780_, 0, v___x_788_);
v___x_790_ = v___x_780_;
goto v_reusejp_789_;
}
else
{
lean_object* v_reuseFailAlloc_794_; 
v_reuseFailAlloc_794_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_794_, 0, v___x_788_);
lean_ctor_set(v_reuseFailAlloc_794_, 1, v_tail_778_);
v___x_790_ = v_reuseFailAlloc_794_;
goto v_reusejp_789_;
}
v_reusejp_789_:
{
lean_object* v___x_792_; 
if (v_isShared_777_ == 0)
{
lean_ctor_set(v___x_776_, 0, v___x_790_);
v___x_792_ = v___x_776_;
goto v_reusejp_791_;
}
else
{
lean_object* v_reuseFailAlloc_793_; 
v_reuseFailAlloc_793_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_793_, 0, v___x_790_);
v___x_792_ = v_reuseFailAlloc_793_;
goto v_reusejp_791_;
}
v_reusejp_791_:
{
return v___x_792_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_800_; 
lean_dec(v_head_773_);
lean_dec_ref_known(v_tail_772_, 2);
lean_dec_ref_known(v_head_771_, 1);
v___x_800_ = lean_box(0);
return v___x_800_;
}
}
else
{
lean_object* v___x_801_; 
lean_dec_ref_known(v_head_771_, 1);
lean_dec(v_tail_772_);
v___x_801_ = lean_box(0);
return v___x_801_;
}
}
else
{
lean_object* v___x_802_; 
lean_dec_ref_known(v_stack_720_, 2);
lean_dec(v_head_771_);
v___x_802_ = lean_box(0);
return v___x_802_;
}
}
else
{
lean_object* v___x_803_; 
lean_dec(v_stack_720_);
v___x_803_ = lean_box(0);
return v___x_803_;
}
}
case 6:
{
if (lean_obj_tag(v_stack_720_) == 1)
{
lean_object* v_head_804_; 
v_head_804_ = lean_ctor_get(v_stack_720_, 0);
lean_inc(v_head_804_);
if (lean_obj_tag(v_head_804_) == 1)
{
lean_object* v_tail_805_; lean_object* v___x_807_; uint8_t v_isShared_808_; uint8_t v_isSharedCheck_822_; 
v_tail_805_ = lean_ctor_get(v_stack_720_, 1);
v_isSharedCheck_822_ = !lean_is_exclusive(v_stack_720_);
if (v_isSharedCheck_822_ == 0)
{
lean_object* v_unused_823_; 
v_unused_823_ = lean_ctor_get(v_stack_720_, 0);
lean_dec(v_unused_823_);
v___x_807_ = v_stack_720_;
v_isShared_808_ = v_isSharedCheck_822_;
goto v_resetjp_806_;
}
else
{
lean_inc(v_tail_805_);
lean_dec(v_stack_720_);
v___x_807_ = lean_box(0);
v_isShared_808_ = v_isSharedCheck_822_;
goto v_resetjp_806_;
}
v_resetjp_806_:
{
lean_object* v_items_809_; lean_object* v___x_811_; uint8_t v_isShared_812_; uint8_t v_isSharedCheck_821_; 
v_items_809_ = lean_ctor_get(v_head_804_, 0);
v_isSharedCheck_821_ = !lean_is_exclusive(v_head_804_);
if (v_isSharedCheck_821_ == 0)
{
v___x_811_ = v_head_804_;
v_isShared_812_ = v_isSharedCheck_821_;
goto v_resetjp_810_;
}
else
{
lean_inc(v_items_809_);
lean_dec(v_head_804_);
v___x_811_ = lean_box(0);
v_isShared_812_ = v_isSharedCheck_821_;
goto v_resetjp_810_;
}
v_resetjp_810_:
{
lean_object* v___x_813_; lean_object* v___x_815_; 
v___x_813_ = lean_alloc_ctor(4, 1, 0);
lean_ctor_set(v___x_813_, 0, v_items_809_);
if (v_isShared_812_ == 0)
{
lean_ctor_set_tag(v___x_811_, 0);
lean_ctor_set(v___x_811_, 0, v___x_813_);
v___x_815_ = v___x_811_;
goto v_reusejp_814_;
}
else
{
lean_object* v_reuseFailAlloc_820_; 
v_reuseFailAlloc_820_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_820_, 0, v___x_813_);
v___x_815_ = v_reuseFailAlloc_820_;
goto v_reusejp_814_;
}
v_reusejp_814_:
{
lean_object* v___x_817_; 
if (v_isShared_808_ == 0)
{
lean_ctor_set(v___x_807_, 0, v___x_815_);
v___x_817_ = v___x_807_;
goto v_reusejp_816_;
}
else
{
lean_object* v_reuseFailAlloc_819_; 
v_reuseFailAlloc_819_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_819_, 0, v___x_815_);
lean_ctor_set(v_reuseFailAlloc_819_, 1, v_tail_805_);
v___x_817_ = v_reuseFailAlloc_819_;
goto v_reusejp_816_;
}
v_reusejp_816_:
{
lean_object* v___x_818_; 
v___x_818_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_818_, 0, v___x_817_);
return v___x_818_;
}
}
}
}
}
else
{
lean_object* v___x_824_; 
lean_dec_ref_known(v_stack_720_, 2);
lean_dec(v_head_804_);
v___x_824_ = lean_box(0);
return v___x_824_;
}
}
else
{
lean_object* v___x_825_; 
lean_dec(v_stack_720_);
v___x_825_ = lean_box(0);
return v___x_825_;
}
}
case 7:
{
lean_object* v___x_826_; lean_object* v___x_827_; lean_object* v___x_828_; 
v___x_826_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_step___closed__2));
v___x_827_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_827_, 0, v___x_826_);
lean_ctor_set(v___x_827_, 1, v_stack_720_);
v___x_828_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_828_, 0, v___x_827_);
return v___x_828_;
}
case 8:
{
if (lean_obj_tag(v_stack_720_) == 1)
{
lean_object* v_head_829_; 
v_head_829_ = lean_ctor_get(v_stack_720_, 0);
lean_inc(v_head_829_);
if (lean_obj_tag(v_head_829_) == 2)
{
lean_object* v_tail_830_; 
v_tail_830_ = lean_ctor_get(v_stack_720_, 1);
lean_inc(v_tail_830_);
lean_dec_ref_known(v_stack_720_, 2);
if (lean_obj_tag(v_tail_830_) == 1)
{
lean_object* v_head_831_; 
v_head_831_ = lean_ctor_get(v_tail_830_, 0);
lean_inc(v_head_831_);
if (lean_obj_tag(v_head_831_) == 0)
{
lean_object* v_key_832_; lean_object* v_fields_833_; lean_object* v___x_835_; uint8_t v_isShared_836_; uint8_t v_isSharedCheck_858_; 
v_key_832_ = lean_ctor_get(v_x_721_, 0);
lean_inc_ref(v_key_832_);
lean_dec_ref_known(v_x_721_, 1);
v_fields_833_ = lean_ctor_get(v_head_829_, 0);
v_isSharedCheck_858_ = !lean_is_exclusive(v_head_829_);
if (v_isSharedCheck_858_ == 0)
{
v___x_835_ = v_head_829_;
v_isShared_836_ = v_isSharedCheck_858_;
goto v_resetjp_834_;
}
else
{
lean_inc(v_fields_833_);
lean_dec(v_head_829_);
v___x_835_ = lean_box(0);
v_isShared_836_ = v_isSharedCheck_858_;
goto v_resetjp_834_;
}
v_resetjp_834_:
{
lean_object* v_tail_837_; lean_object* v___x_839_; uint8_t v_isShared_840_; uint8_t v_isSharedCheck_856_; 
v_tail_837_ = lean_ctor_get(v_tail_830_, 1);
v_isSharedCheck_856_ = !lean_is_exclusive(v_tail_830_);
if (v_isSharedCheck_856_ == 0)
{
lean_object* v_unused_857_; 
v_unused_857_ = lean_ctor_get(v_tail_830_, 0);
lean_dec(v_unused_857_);
v___x_839_ = v_tail_830_;
v_isShared_840_ = v_isSharedCheck_856_;
goto v_resetjp_838_;
}
else
{
lean_inc(v_tail_837_);
lean_dec(v_tail_830_);
v___x_839_ = lean_box(0);
v_isShared_840_ = v_isSharedCheck_856_;
goto v_resetjp_838_;
}
v_resetjp_838_:
{
lean_object* v_value_841_; lean_object* v___x_843_; uint8_t v_isShared_844_; uint8_t v_isSharedCheck_855_; 
v_value_841_ = lean_ctor_get(v_head_831_, 0);
v_isSharedCheck_855_ = !lean_is_exclusive(v_head_831_);
if (v_isSharedCheck_855_ == 0)
{
v___x_843_ = v_head_831_;
v_isShared_844_ = v_isSharedCheck_855_;
goto v_resetjp_842_;
}
else
{
lean_inc(v_value_841_);
lean_dec(v_head_831_);
v___x_843_ = lean_box(0);
v_isShared_844_ = v_isSharedCheck_855_;
goto v_resetjp_842_;
}
v_resetjp_842_:
{
lean_object* v___x_845_; lean_object* v___x_847_; 
v___x_845_ = lean_alloc_ctor(1, 3, 0);
lean_ctor_set(v___x_845_, 0, v_key_832_);
lean_ctor_set(v___x_845_, 1, v_value_841_);
lean_ctor_set(v___x_845_, 2, v_fields_833_);
if (v_isShared_844_ == 0)
{
lean_ctor_set_tag(v___x_843_, 2);
lean_ctor_set(v___x_843_, 0, v___x_845_);
v___x_847_ = v___x_843_;
goto v_reusejp_846_;
}
else
{
lean_object* v_reuseFailAlloc_854_; 
v_reuseFailAlloc_854_ = lean_alloc_ctor(2, 1, 0);
lean_ctor_set(v_reuseFailAlloc_854_, 0, v___x_845_);
v___x_847_ = v_reuseFailAlloc_854_;
goto v_reusejp_846_;
}
v_reusejp_846_:
{
lean_object* v___x_849_; 
if (v_isShared_840_ == 0)
{
lean_ctor_set(v___x_839_, 0, v___x_847_);
v___x_849_ = v___x_839_;
goto v_reusejp_848_;
}
else
{
lean_object* v_reuseFailAlloc_853_; 
v_reuseFailAlloc_853_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_853_, 0, v___x_847_);
lean_ctor_set(v_reuseFailAlloc_853_, 1, v_tail_837_);
v___x_849_ = v_reuseFailAlloc_853_;
goto v_reusejp_848_;
}
v_reusejp_848_:
{
lean_object* v___x_851_; 
if (v_isShared_836_ == 0)
{
lean_ctor_set_tag(v___x_835_, 1);
lean_ctor_set(v___x_835_, 0, v___x_849_);
v___x_851_ = v___x_835_;
goto v_reusejp_850_;
}
else
{
lean_object* v_reuseFailAlloc_852_; 
v_reuseFailAlloc_852_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_852_, 0, v___x_849_);
v___x_851_ = v_reuseFailAlloc_852_;
goto v_reusejp_850_;
}
v_reusejp_850_:
{
return v___x_851_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_859_; 
lean_dec(v_head_831_);
lean_dec_ref_known(v_tail_830_, 2);
lean_dec_ref_known(v_head_829_, 1);
lean_dec_ref_known(v_x_721_, 1);
v___x_859_ = lean_box(0);
return v___x_859_;
}
}
else
{
lean_object* v___x_860_; 
lean_dec(v_tail_830_);
lean_dec_ref_known(v_head_829_, 1);
lean_dec_ref_known(v_x_721_, 1);
v___x_860_ = lean_box(0);
return v___x_860_;
}
}
else
{
lean_object* v___x_861_; 
lean_dec_ref_known(v_stack_720_, 2);
lean_dec(v_head_829_);
lean_dec_ref_known(v_x_721_, 1);
v___x_861_ = lean_box(0);
return v___x_861_;
}
}
else
{
lean_object* v___x_862_; 
lean_dec_ref_known(v_x_721_, 1);
lean_dec(v_stack_720_);
v___x_862_ = lean_box(0);
return v___x_862_;
}
}
default: 
{
if (lean_obj_tag(v_stack_720_) == 1)
{
lean_object* v_head_863_; 
v_head_863_ = lean_ctor_get(v_stack_720_, 0);
lean_inc(v_head_863_);
if (lean_obj_tag(v_head_863_) == 2)
{
lean_object* v_tail_864_; lean_object* v___x_866_; uint8_t v_isShared_867_; uint8_t v_isSharedCheck_881_; 
v_tail_864_ = lean_ctor_get(v_stack_720_, 1);
v_isSharedCheck_881_ = !lean_is_exclusive(v_stack_720_);
if (v_isSharedCheck_881_ == 0)
{
lean_object* v_unused_882_; 
v_unused_882_ = lean_ctor_get(v_stack_720_, 0);
lean_dec(v_unused_882_);
v___x_866_ = v_stack_720_;
v_isShared_867_ = v_isSharedCheck_881_;
goto v_resetjp_865_;
}
else
{
lean_inc(v_tail_864_);
lean_dec(v_stack_720_);
v___x_866_ = lean_box(0);
v_isShared_867_ = v_isSharedCheck_881_;
goto v_resetjp_865_;
}
v_resetjp_865_:
{
lean_object* v_fields_868_; lean_object* v___x_870_; uint8_t v_isShared_871_; uint8_t v_isSharedCheck_880_; 
v_fields_868_ = lean_ctor_get(v_head_863_, 0);
v_isSharedCheck_880_ = !lean_is_exclusive(v_head_863_);
if (v_isSharedCheck_880_ == 0)
{
v___x_870_ = v_head_863_;
v_isShared_871_ = v_isSharedCheck_880_;
goto v_resetjp_869_;
}
else
{
lean_inc(v_fields_868_);
lean_dec(v_head_863_);
v___x_870_ = lean_box(0);
v_isShared_871_ = v_isSharedCheck_880_;
goto v_resetjp_869_;
}
v_resetjp_869_:
{
lean_object* v___x_872_; lean_object* v___x_874_; 
v___x_872_ = lean_alloc_ctor(5, 1, 0);
lean_ctor_set(v___x_872_, 0, v_fields_868_);
if (v_isShared_871_ == 0)
{
lean_ctor_set_tag(v___x_870_, 0);
lean_ctor_set(v___x_870_, 0, v___x_872_);
v___x_874_ = v___x_870_;
goto v_reusejp_873_;
}
else
{
lean_object* v_reuseFailAlloc_879_; 
v_reuseFailAlloc_879_ = lean_alloc_ctor(0, 1, 0);
lean_ctor_set(v_reuseFailAlloc_879_, 0, v___x_872_);
v___x_874_ = v_reuseFailAlloc_879_;
goto v_reusejp_873_;
}
v_reusejp_873_:
{
lean_object* v___x_876_; 
if (v_isShared_867_ == 0)
{
lean_ctor_set(v___x_866_, 0, v___x_874_);
v___x_876_ = v___x_866_;
goto v_reusejp_875_;
}
else
{
lean_object* v_reuseFailAlloc_878_; 
v_reuseFailAlloc_878_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_878_, 0, v___x_874_);
lean_ctor_set(v_reuseFailAlloc_878_, 1, v_tail_864_);
v___x_876_ = v_reuseFailAlloc_878_;
goto v_reusejp_875_;
}
v_reusejp_875_:
{
lean_object* v___x_877_; 
v___x_877_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_877_, 0, v___x_876_);
return v___x_877_;
}
}
}
}
}
else
{
lean_object* v___x_883_; 
lean_dec_ref_known(v_stack_720_, 2);
lean_dec(v_head_863_);
v___x_883_ = lean_box(0);
return v___x_883_;
}
}
else
{
lean_object* v___x_884_; 
lean_dec(v_stack_720_);
v___x_884_ = lean_box(0);
return v___x_884_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_foldl___at___00Algal_Core_Json_execute_spec__0(lean_object* v_x_885_, lean_object* v_x_886_){
_start:
{
if (lean_obj_tag(v_x_886_) == 0)
{
return v_x_885_;
}
else
{
if (lean_obj_tag(v_x_885_) == 0)
{
lean_object* v_tail_887_; 
v_tail_887_ = lean_ctor_get(v_x_886_, 1);
lean_inc(v_tail_887_);
lean_dec_ref_known(v_x_886_, 2);
v_x_886_ = v_tail_887_;
goto _start;
}
else
{
lean_object* v_head_889_; lean_object* v_tail_890_; lean_object* v_val_891_; lean_object* v___x_892_; 
v_head_889_ = lean_ctor_get(v_x_886_, 0);
lean_inc(v_head_889_);
v_tail_890_ = lean_ctor_get(v_x_886_, 1);
lean_inc(v_tail_890_);
lean_dec_ref_known(v_x_886_, 2);
v_val_891_ = lean_ctor_get(v_x_885_, 0);
lean_inc(v_val_891_);
lean_dec_ref_known(v_x_885_, 1);
v___x_892_ = lp_algalVerification_Algal_Core_Json_step(v_val_891_, v_head_889_);
v_x_885_ = v___x_892_;
v_x_886_ = v_tail_890_;
goto _start;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_execute(lean_object* v_tokens_894_, lean_object* v_state_895_){
_start:
{
lean_object* v___x_896_; 
v___x_896_ = lp_algalVerification_List_foldl___at___00Algal_Core_Json_execute_spec__0(v_state_895_, v_tokens_894_);
return v___x_896_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_encodeItems(lean_object* v_x_909_){
_start:
{
if (lean_obj_tag(v_x_909_) == 0)
{
lean_object* v___x_910_; 
v___x_910_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_encodeItems___closed__0));
return v___x_910_;
}
else
{
lean_object* v_value_911_; lean_object* v_rest_912_; lean_object* v___x_913_; lean_object* v___x_914_; lean_object* v___x_915_; lean_object* v___x_916_; lean_object* v___x_917_; 
v_value_911_ = lean_ctor_get(v_x_909_, 0);
lean_inc(v_value_911_);
v_rest_912_ = lean_ctor_get(v_x_909_, 1);
lean_inc(v_rest_912_);
lean_dec_ref_known(v_x_909_, 2);
v___x_913_ = lp_algalVerification_Algal_Core_Json_encode(v_value_911_);
v___x_914_ = lp_algalVerification_Algal_Core_Json_encodeItems(v_rest_912_);
v___x_915_ = l_List_appendTR___redArg(v___x_913_, v___x_914_);
v___x_916_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_encodeItems___closed__1));
v___x_917_ = l_List_appendTR___redArg(v___x_915_, v___x_916_);
return v___x_917_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_encode(lean_object* v_x_924_){
_start:
{
switch(lean_obj_tag(v_x_924_))
{
case 0:
{
lean_object* v___x_925_; 
v___x_925_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_encode___closed__0));
return v___x_925_;
}
case 1:
{
uint8_t v_value_926_; lean_object* v___x_928_; uint8_t v_isShared_929_; uint8_t v_isSharedCheck_935_; 
v_value_926_ = lean_ctor_get_uint8(v_x_924_, 0);
v_isSharedCheck_935_ = !lean_is_exclusive(v_x_924_);
if (v_isSharedCheck_935_ == 0)
{
v___x_928_ = v_x_924_;
v_isShared_929_ = v_isSharedCheck_935_;
goto v_resetjp_927_;
}
else
{
lean_dec(v_x_924_);
v___x_928_ = lean_box(0);
v_isShared_929_ = v_isSharedCheck_935_;
goto v_resetjp_927_;
}
v_resetjp_927_:
{
lean_object* v___x_931_; 
if (v_isShared_929_ == 0)
{
v___x_931_ = v___x_928_;
goto v_reusejp_930_;
}
else
{
lean_object* v_reuseFailAlloc_934_; 
v_reuseFailAlloc_934_ = lean_alloc_ctor(1, 0, 1);
lean_ctor_set_uint8(v_reuseFailAlloc_934_, 0, v_value_926_);
v___x_931_ = v_reuseFailAlloc_934_;
goto v_reusejp_930_;
}
v_reusejp_930_:
{
lean_object* v___x_932_; lean_object* v___x_933_; 
v___x_932_ = lean_box(0);
v___x_933_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_933_, 0, v___x_931_);
lean_ctor_set(v___x_933_, 1, v___x_932_);
return v___x_933_;
}
}
}
case 2:
{
uint64_t v_value_936_; lean_object* v___x_938_; uint8_t v_isShared_939_; uint8_t v_isSharedCheck_945_; 
v_value_936_ = lean_ctor_get_uint64(v_x_924_, 0);
v_isSharedCheck_945_ = !lean_is_exclusive(v_x_924_);
if (v_isSharedCheck_945_ == 0)
{
v___x_938_ = v_x_924_;
v_isShared_939_ = v_isSharedCheck_945_;
goto v_resetjp_937_;
}
else
{
lean_dec(v_x_924_);
v___x_938_ = lean_box(0);
v_isShared_939_ = v_isSharedCheck_945_;
goto v_resetjp_937_;
}
v_resetjp_937_:
{
lean_object* v___x_941_; 
if (v_isShared_939_ == 0)
{
v___x_941_ = v___x_938_;
goto v_reusejp_940_;
}
else
{
lean_object* v_reuseFailAlloc_944_; 
v_reuseFailAlloc_944_ = lean_alloc_ctor(2, 0, 8);
lean_ctor_set_uint64(v_reuseFailAlloc_944_, 0, v_value_936_);
v___x_941_ = v_reuseFailAlloc_944_;
goto v_reusejp_940_;
}
v_reusejp_940_:
{
lean_object* v___x_942_; lean_object* v___x_943_; 
v___x_942_ = lean_box(0);
v___x_943_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_943_, 0, v___x_941_);
lean_ctor_set(v___x_943_, 1, v___x_942_);
return v___x_943_;
}
}
}
case 3:
{
lean_object* v_value_946_; lean_object* v___x_948_; uint8_t v_isShared_949_; uint8_t v_isSharedCheck_955_; 
v_value_946_ = lean_ctor_get(v_x_924_, 0);
v_isSharedCheck_955_ = !lean_is_exclusive(v_x_924_);
if (v_isSharedCheck_955_ == 0)
{
v___x_948_ = v_x_924_;
v_isShared_949_ = v_isSharedCheck_955_;
goto v_resetjp_947_;
}
else
{
lean_inc(v_value_946_);
lean_dec(v_x_924_);
v___x_948_ = lean_box(0);
v_isShared_949_ = v_isSharedCheck_955_;
goto v_resetjp_947_;
}
v_resetjp_947_:
{
lean_object* v___x_951_; 
if (v_isShared_949_ == 0)
{
v___x_951_ = v___x_948_;
goto v_reusejp_950_;
}
else
{
lean_object* v_reuseFailAlloc_954_; 
v_reuseFailAlloc_954_ = lean_alloc_ctor(3, 1, 0);
lean_ctor_set(v_reuseFailAlloc_954_, 0, v_value_946_);
v___x_951_ = v_reuseFailAlloc_954_;
goto v_reusejp_950_;
}
v_reusejp_950_:
{
lean_object* v___x_952_; lean_object* v___x_953_; 
v___x_952_ = lean_box(0);
v___x_953_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_953_, 0, v___x_951_);
lean_ctor_set(v___x_953_, 1, v___x_952_);
return v___x_953_;
}
}
}
case 4:
{
lean_object* v_values_956_; lean_object* v___x_957_; lean_object* v___x_958_; lean_object* v___x_959_; 
v_values_956_ = lean_ctor_get(v_x_924_, 0);
lean_inc(v_values_956_);
lean_dec_ref_known(v_x_924_, 1);
v___x_957_ = lp_algalVerification_Algal_Core_Json_encodeItems(v_values_956_);
v___x_958_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_encode___closed__1));
v___x_959_ = l_List_appendTR___redArg(v___x_957_, v___x_958_);
return v___x_959_;
}
default: 
{
lean_object* v_fields_960_; lean_object* v___x_961_; lean_object* v___x_962_; lean_object* v___x_963_; 
v_fields_960_ = lean_ctor_get(v_x_924_, 0);
lean_inc(v_fields_960_);
lean_dec_ref_known(v_x_924_, 1);
v___x_961_ = lp_algalVerification_Algal_Core_Json_encodeFields(v_fields_960_);
v___x_962_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_encode___closed__2));
v___x_963_ = l_List_appendTR___redArg(v___x_961_, v___x_962_);
return v___x_963_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_encodeFields(lean_object* v_x_964_){
_start:
{
if (lean_obj_tag(v_x_964_) == 0)
{
lean_object* v___x_965_; 
v___x_965_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_encodeFields___closed__0));
return v___x_965_;
}
else
{
lean_object* v_key_966_; lean_object* v_value_967_; lean_object* v_rest_968_; lean_object* v___x_969_; lean_object* v___x_970_; lean_object* v___x_971_; lean_object* v___x_972_; lean_object* v___x_973_; lean_object* v___x_974_; lean_object* v___x_975_; 
v_key_966_ = lean_ctor_get(v_x_964_, 0);
lean_inc_ref(v_key_966_);
v_value_967_ = lean_ctor_get(v_x_964_, 1);
lean_inc(v_value_967_);
v_rest_968_ = lean_ctor_get(v_x_964_, 2);
lean_inc(v_rest_968_);
lean_dec_ref_known(v_x_964_, 3);
v___x_969_ = lp_algalVerification_Algal_Core_Json_encode(v_value_967_);
v___x_970_ = lp_algalVerification_Algal_Core_Json_encodeFields(v_rest_968_);
v___x_971_ = l_List_appendTR___redArg(v___x_969_, v___x_970_);
v___x_972_ = lean_alloc_ctor(8, 1, 0);
lean_ctor_set(v___x_972_, 0, v_key_966_);
v___x_973_ = lean_box(0);
v___x_974_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_974_, 0, v___x_972_);
lean_ctor_set(v___x_974_, 1, v___x_973_);
v___x_975_ = l_List_appendTR___redArg(v___x_971_, v___x_974_);
return v___x_975_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__13_splitter___redArg(lean_object* v_x_976_, lean_object* v_h__1_977_, lean_object* v_h__2_978_, lean_object* v_h__3_979_, lean_object* v_h__4_980_, lean_object* v_h__5_981_, lean_object* v_h__6_982_, lean_object* v_h__7_983_, lean_object* v_h__8_984_, lean_object* v_h__9_985_, lean_object* v_h__10_986_){
_start:
{
switch(lean_obj_tag(v_x_976_))
{
case 0:
{
lean_object* v___x_987_; lean_object* v___x_988_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
v___x_987_ = lean_box(0);
v___x_988_ = lean_apply_1(v_h__1_977_, v___x_987_);
return v___x_988_;
}
case 1:
{
uint8_t v_value_989_; lean_object* v___x_990_; lean_object* v___x_991_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__1_977_);
v_value_989_ = lean_ctor_get_uint8(v_x_976_, 0);
lean_dec_ref_known(v_x_976_, 0);
v___x_990_ = lean_box(v_value_989_);
v___x_991_ = lean_apply_1(v_h__2_978_, v___x_990_);
return v___x_991_;
}
case 2:
{
uint64_t v_bits_992_; lean_object* v___x_993_; lean_object* v___x_994_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v_bits_992_ = lean_ctor_get_uint64(v_x_976_, 0);
lean_dec_ref_known(v_x_976_, 0);
v___x_993_ = lean_box_uint64(v_bits_992_);
v___x_994_ = lean_apply_1(v_h__3_979_, v___x_993_);
return v___x_994_;
}
case 3:
{
lean_object* v_value_995_; lean_object* v___x_996_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v_value_995_ = lean_ctor_get(v_x_976_, 0);
lean_inc_ref(v_value_995_);
lean_dec_ref_known(v_x_976_, 1);
v___x_996_ = lean_apply_1(v_h__4_980_, v_value_995_);
return v___x_996_;
}
case 4:
{
lean_object* v___x_997_; lean_object* v___x_998_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v___x_997_ = lean_box(0);
v___x_998_ = lean_apply_1(v_h__5_981_, v___x_997_);
return v___x_998_;
}
case 5:
{
lean_object* v___x_999_; lean_object* v___x_1000_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v___x_999_ = lean_box(0);
v___x_1000_ = lean_apply_1(v_h__6_982_, v___x_999_);
return v___x_1000_;
}
case 6:
{
lean_object* v___x_1001_; lean_object* v___x_1002_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v___x_1001_ = lean_box(0);
v___x_1002_ = lean_apply_1(v_h__7_983_, v___x_1001_);
return v___x_1002_;
}
case 7:
{
lean_object* v___x_1003_; lean_object* v___x_1004_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__9_985_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v___x_1003_ = lean_box(0);
v___x_1004_ = lean_apply_1(v_h__8_984_, v___x_1003_);
return v___x_1004_;
}
case 8:
{
lean_object* v_key_1005_; lean_object* v___x_1006_; 
lean_dec(v_h__10_986_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v_key_1005_ = lean_ctor_get(v_x_976_, 0);
lean_inc_ref(v_key_1005_);
lean_dec_ref_known(v_x_976_, 1);
v___x_1006_ = lean_apply_1(v_h__9_985_, v_key_1005_);
return v___x_1006_;
}
default: 
{
lean_object* v___x_1007_; lean_object* v___x_1008_; 
lean_dec(v_h__9_985_);
lean_dec(v_h__8_984_);
lean_dec(v_h__7_983_);
lean_dec(v_h__6_982_);
lean_dec(v_h__5_981_);
lean_dec(v_h__4_980_);
lean_dec(v_h__3_979_);
lean_dec(v_h__2_978_);
lean_dec(v_h__1_977_);
v___x_1007_ = lean_box(0);
v___x_1008_ = lean_apply_1(v_h__10_986_, v___x_1007_);
return v___x_1008_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__13_splitter(lean_object* v_motive_1009_, lean_object* v_x_1010_, lean_object* v_h__1_1011_, lean_object* v_h__2_1012_, lean_object* v_h__3_1013_, lean_object* v_h__4_1014_, lean_object* v_h__5_1015_, lean_object* v_h__6_1016_, lean_object* v_h__7_1017_, lean_object* v_h__8_1018_, lean_object* v_h__9_1019_, lean_object* v_h__10_1020_){
_start:
{
switch(lean_obj_tag(v_x_1010_))
{
case 0:
{
lean_object* v___x_1021_; lean_object* v___x_1022_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
v___x_1021_ = lean_box(0);
v___x_1022_ = lean_apply_1(v_h__1_1011_, v___x_1021_);
return v___x_1022_;
}
case 1:
{
uint8_t v_value_1023_; lean_object* v___x_1024_; lean_object* v___x_1025_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__1_1011_);
v_value_1023_ = lean_ctor_get_uint8(v_x_1010_, 0);
lean_dec_ref_known(v_x_1010_, 0);
v___x_1024_ = lean_box(v_value_1023_);
v___x_1025_ = lean_apply_1(v_h__2_1012_, v___x_1024_);
return v___x_1025_;
}
case 2:
{
uint64_t v_bits_1026_; lean_object* v___x_1027_; lean_object* v___x_1028_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v_bits_1026_ = lean_ctor_get_uint64(v_x_1010_, 0);
lean_dec_ref_known(v_x_1010_, 0);
v___x_1027_ = lean_box_uint64(v_bits_1026_);
v___x_1028_ = lean_apply_1(v_h__3_1013_, v___x_1027_);
return v___x_1028_;
}
case 3:
{
lean_object* v_value_1029_; lean_object* v___x_1030_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v_value_1029_ = lean_ctor_get(v_x_1010_, 0);
lean_inc_ref(v_value_1029_);
lean_dec_ref_known(v_x_1010_, 1);
v___x_1030_ = lean_apply_1(v_h__4_1014_, v_value_1029_);
return v___x_1030_;
}
case 4:
{
lean_object* v___x_1031_; lean_object* v___x_1032_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v___x_1031_ = lean_box(0);
v___x_1032_ = lean_apply_1(v_h__5_1015_, v___x_1031_);
return v___x_1032_;
}
case 5:
{
lean_object* v___x_1033_; lean_object* v___x_1034_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v___x_1033_ = lean_box(0);
v___x_1034_ = lean_apply_1(v_h__6_1016_, v___x_1033_);
return v___x_1034_;
}
case 6:
{
lean_object* v___x_1035_; lean_object* v___x_1036_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v___x_1035_ = lean_box(0);
v___x_1036_ = lean_apply_1(v_h__7_1017_, v___x_1035_);
return v___x_1036_;
}
case 7:
{
lean_object* v___x_1037_; lean_object* v___x_1038_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__9_1019_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v___x_1037_ = lean_box(0);
v___x_1038_ = lean_apply_1(v_h__8_1018_, v___x_1037_);
return v___x_1038_;
}
case 8:
{
lean_object* v_key_1039_; lean_object* v___x_1040_; 
lean_dec(v_h__10_1020_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v_key_1039_ = lean_ctor_get(v_x_1010_, 0);
lean_inc_ref(v_key_1039_);
lean_dec_ref_known(v_x_1010_, 1);
v___x_1040_ = lean_apply_1(v_h__9_1019_, v_key_1039_);
return v___x_1040_;
}
default: 
{
lean_object* v___x_1041_; lean_object* v___x_1042_; 
lean_dec(v_h__9_1019_);
lean_dec(v_h__8_1018_);
lean_dec(v_h__7_1017_);
lean_dec(v_h__6_1016_);
lean_dec(v_h__5_1015_);
lean_dec(v_h__4_1014_);
lean_dec(v_h__3_1013_);
lean_dec(v_h__2_1012_);
lean_dec(v_h__1_1011_);
v___x_1041_ = lean_box(0);
v___x_1042_ = lean_apply_1(v_h__10_1020_, v___x_1041_);
return v___x_1042_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__1_splitter___redArg(lean_object* v_stack_1043_, lean_object* v_h__1_1044_, lean_object* v_h__2_1045_){
_start:
{
if (lean_obj_tag(v_stack_1043_) == 1)
{
lean_object* v_head_1046_; 
v_head_1046_ = lean_ctor_get(v_stack_1043_, 0);
if (lean_obj_tag(v_head_1046_) == 1)
{
lean_object* v_tail_1047_; 
v_tail_1047_ = lean_ctor_get(v_stack_1043_, 1);
if (lean_obj_tag(v_tail_1047_) == 1)
{
lean_object* v_head_1048_; 
v_head_1048_ = lean_ctor_get(v_tail_1047_, 0);
if (lean_obj_tag(v_head_1048_) == 0)
{
lean_object* v_items_1049_; lean_object* v_tail_1050_; lean_object* v_value_1051_; lean_object* v___x_1052_; 
lean_inc_ref(v_head_1048_);
lean_inc_ref(v_tail_1047_);
lean_inc_ref(v_head_1046_);
lean_dec_ref_known(v_stack_1043_, 2);
lean_dec(v_h__2_1045_);
v_items_1049_ = lean_ctor_get(v_head_1046_, 0);
lean_inc(v_items_1049_);
lean_dec_ref_known(v_head_1046_, 1);
v_tail_1050_ = lean_ctor_get(v_tail_1047_, 1);
lean_inc(v_tail_1050_);
lean_dec_ref_known(v_tail_1047_, 2);
v_value_1051_ = lean_ctor_get(v_head_1048_, 0);
lean_inc(v_value_1051_);
lean_dec_ref_known(v_head_1048_, 1);
v___x_1052_ = lean_apply_3(v_h__1_1044_, v_items_1049_, v_value_1051_, v_tail_1050_);
return v___x_1052_;
}
else
{
lean_object* v___x_1053_; 
lean_dec(v_h__1_1044_);
v___x_1053_ = lean_apply_2(v_h__2_1045_, v_stack_1043_, lean_box(0));
return v___x_1053_;
}
}
else
{
lean_object* v___x_1054_; 
lean_dec(v_h__1_1044_);
v___x_1054_ = lean_apply_2(v_h__2_1045_, v_stack_1043_, lean_box(0));
return v___x_1054_;
}
}
else
{
lean_object* v___x_1055_; 
lean_dec(v_h__1_1044_);
v___x_1055_ = lean_apply_2(v_h__2_1045_, v_stack_1043_, lean_box(0));
return v___x_1055_;
}
}
else
{
lean_object* v___x_1056_; 
lean_dec(v_h__1_1044_);
v___x_1056_ = lean_apply_2(v_h__2_1045_, v_stack_1043_, lean_box(0));
return v___x_1056_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__1_splitter(lean_object* v_motive_1057_, lean_object* v_stack_1058_, lean_object* v_h__1_1059_, lean_object* v_h__2_1060_){
_start:
{
if (lean_obj_tag(v_stack_1058_) == 1)
{
lean_object* v_head_1061_; 
v_head_1061_ = lean_ctor_get(v_stack_1058_, 0);
if (lean_obj_tag(v_head_1061_) == 1)
{
lean_object* v_tail_1062_; 
v_tail_1062_ = lean_ctor_get(v_stack_1058_, 1);
if (lean_obj_tag(v_tail_1062_) == 1)
{
lean_object* v_head_1063_; 
v_head_1063_ = lean_ctor_get(v_tail_1062_, 0);
if (lean_obj_tag(v_head_1063_) == 0)
{
lean_object* v_items_1064_; lean_object* v_tail_1065_; lean_object* v_value_1066_; lean_object* v___x_1067_; 
lean_inc_ref(v_head_1063_);
lean_inc_ref(v_tail_1062_);
lean_inc_ref(v_head_1061_);
lean_dec_ref_known(v_stack_1058_, 2);
lean_dec(v_h__2_1060_);
v_items_1064_ = lean_ctor_get(v_head_1061_, 0);
lean_inc(v_items_1064_);
lean_dec_ref_known(v_head_1061_, 1);
v_tail_1065_ = lean_ctor_get(v_tail_1062_, 1);
lean_inc(v_tail_1065_);
lean_dec_ref_known(v_tail_1062_, 2);
v_value_1066_ = lean_ctor_get(v_head_1063_, 0);
lean_inc(v_value_1066_);
lean_dec_ref_known(v_head_1063_, 1);
v___x_1067_ = lean_apply_3(v_h__1_1059_, v_items_1064_, v_value_1066_, v_tail_1065_);
return v___x_1067_;
}
else
{
lean_object* v___x_1068_; 
lean_dec(v_h__1_1059_);
v___x_1068_ = lean_apply_2(v_h__2_1060_, v_stack_1058_, lean_box(0));
return v___x_1068_;
}
}
else
{
lean_object* v___x_1069_; 
lean_dec(v_h__1_1059_);
v___x_1069_ = lean_apply_2(v_h__2_1060_, v_stack_1058_, lean_box(0));
return v___x_1069_;
}
}
else
{
lean_object* v___x_1070_; 
lean_dec(v_h__1_1059_);
v___x_1070_ = lean_apply_2(v_h__2_1060_, v_stack_1058_, lean_box(0));
return v___x_1070_;
}
}
else
{
lean_object* v___x_1071_; 
lean_dec(v_h__1_1059_);
v___x_1071_ = lean_apply_2(v_h__2_1060_, v_stack_1058_, lean_box(0));
return v___x_1071_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__6_splitter___redArg(lean_object* v_stack_1072_, lean_object* v_h__1_1073_, lean_object* v_h__2_1074_){
_start:
{
if (lean_obj_tag(v_stack_1072_) == 1)
{
lean_object* v_head_1075_; 
v_head_1075_ = lean_ctor_get(v_stack_1072_, 0);
if (lean_obj_tag(v_head_1075_) == 1)
{
lean_object* v_tail_1076_; lean_object* v_items_1077_; lean_object* v___x_1078_; 
lean_inc_ref(v_head_1075_);
lean_dec(v_h__2_1074_);
v_tail_1076_ = lean_ctor_get(v_stack_1072_, 1);
lean_inc(v_tail_1076_);
lean_dec_ref_known(v_stack_1072_, 2);
v_items_1077_ = lean_ctor_get(v_head_1075_, 0);
lean_inc(v_items_1077_);
lean_dec_ref_known(v_head_1075_, 1);
v___x_1078_ = lean_apply_2(v_h__1_1073_, v_items_1077_, v_tail_1076_);
return v___x_1078_;
}
else
{
lean_object* v___x_1079_; 
lean_dec(v_h__1_1073_);
v___x_1079_ = lean_apply_2(v_h__2_1074_, v_stack_1072_, lean_box(0));
return v___x_1079_;
}
}
else
{
lean_object* v___x_1080_; 
lean_dec(v_h__1_1073_);
v___x_1080_ = lean_apply_2(v_h__2_1074_, v_stack_1072_, lean_box(0));
return v___x_1080_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__6_splitter(lean_object* v_motive_1081_, lean_object* v_stack_1082_, lean_object* v_h__1_1083_, lean_object* v_h__2_1084_){
_start:
{
if (lean_obj_tag(v_stack_1082_) == 1)
{
lean_object* v_head_1085_; 
v_head_1085_ = lean_ctor_get(v_stack_1082_, 0);
if (lean_obj_tag(v_head_1085_) == 1)
{
lean_object* v_tail_1086_; lean_object* v_items_1087_; lean_object* v___x_1088_; 
lean_inc_ref(v_head_1085_);
lean_dec(v_h__2_1084_);
v_tail_1086_ = lean_ctor_get(v_stack_1082_, 1);
lean_inc(v_tail_1086_);
lean_dec_ref_known(v_stack_1082_, 2);
v_items_1087_ = lean_ctor_get(v_head_1085_, 0);
lean_inc(v_items_1087_);
lean_dec_ref_known(v_head_1085_, 1);
v___x_1088_ = lean_apply_2(v_h__1_1083_, v_items_1087_, v_tail_1086_);
return v___x_1088_;
}
else
{
lean_object* v___x_1089_; 
lean_dec(v_h__1_1083_);
v___x_1089_ = lean_apply_2(v_h__2_1084_, v_stack_1082_, lean_box(0));
return v___x_1089_;
}
}
else
{
lean_object* v___x_1090_; 
lean_dec(v_h__1_1083_);
v___x_1090_ = lean_apply_2(v_h__2_1084_, v_stack_1082_, lean_box(0));
return v___x_1090_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__8_splitter___redArg(lean_object* v_stack_1091_, lean_object* v_h__1_1092_, lean_object* v_h__2_1093_){
_start:
{
if (lean_obj_tag(v_stack_1091_) == 1)
{
lean_object* v_head_1094_; 
v_head_1094_ = lean_ctor_get(v_stack_1091_, 0);
if (lean_obj_tag(v_head_1094_) == 2)
{
lean_object* v_tail_1095_; 
v_tail_1095_ = lean_ctor_get(v_stack_1091_, 1);
if (lean_obj_tag(v_tail_1095_) == 1)
{
lean_object* v_head_1096_; 
v_head_1096_ = lean_ctor_get(v_tail_1095_, 0);
if (lean_obj_tag(v_head_1096_) == 0)
{
lean_object* v_fields_1097_; lean_object* v_tail_1098_; lean_object* v_value_1099_; lean_object* v___x_1100_; 
lean_inc_ref(v_head_1096_);
lean_inc_ref(v_tail_1095_);
lean_inc_ref(v_head_1094_);
lean_dec_ref_known(v_stack_1091_, 2);
lean_dec(v_h__2_1093_);
v_fields_1097_ = lean_ctor_get(v_head_1094_, 0);
lean_inc(v_fields_1097_);
lean_dec_ref_known(v_head_1094_, 1);
v_tail_1098_ = lean_ctor_get(v_tail_1095_, 1);
lean_inc(v_tail_1098_);
lean_dec_ref_known(v_tail_1095_, 2);
v_value_1099_ = lean_ctor_get(v_head_1096_, 0);
lean_inc(v_value_1099_);
lean_dec_ref_known(v_head_1096_, 1);
v___x_1100_ = lean_apply_3(v_h__1_1092_, v_fields_1097_, v_value_1099_, v_tail_1098_);
return v___x_1100_;
}
else
{
lean_object* v___x_1101_; 
lean_dec(v_h__1_1092_);
v___x_1101_ = lean_apply_2(v_h__2_1093_, v_stack_1091_, lean_box(0));
return v___x_1101_;
}
}
else
{
lean_object* v___x_1102_; 
lean_dec(v_h__1_1092_);
v___x_1102_ = lean_apply_2(v_h__2_1093_, v_stack_1091_, lean_box(0));
return v___x_1102_;
}
}
else
{
lean_object* v___x_1103_; 
lean_dec(v_h__1_1092_);
v___x_1103_ = lean_apply_2(v_h__2_1093_, v_stack_1091_, lean_box(0));
return v___x_1103_;
}
}
else
{
lean_object* v___x_1104_; 
lean_dec(v_h__1_1092_);
v___x_1104_ = lean_apply_2(v_h__2_1093_, v_stack_1091_, lean_box(0));
return v___x_1104_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__8_splitter(lean_object* v_motive_1105_, lean_object* v_stack_1106_, lean_object* v_h__1_1107_, lean_object* v_h__2_1108_){
_start:
{
if (lean_obj_tag(v_stack_1106_) == 1)
{
lean_object* v_head_1109_; 
v_head_1109_ = lean_ctor_get(v_stack_1106_, 0);
if (lean_obj_tag(v_head_1109_) == 2)
{
lean_object* v_tail_1110_; 
v_tail_1110_ = lean_ctor_get(v_stack_1106_, 1);
if (lean_obj_tag(v_tail_1110_) == 1)
{
lean_object* v_head_1111_; 
v_head_1111_ = lean_ctor_get(v_tail_1110_, 0);
if (lean_obj_tag(v_head_1111_) == 0)
{
lean_object* v_fields_1112_; lean_object* v_tail_1113_; lean_object* v_value_1114_; lean_object* v___x_1115_; 
lean_inc_ref(v_head_1111_);
lean_inc_ref(v_tail_1110_);
lean_inc_ref(v_head_1109_);
lean_dec_ref_known(v_stack_1106_, 2);
lean_dec(v_h__2_1108_);
v_fields_1112_ = lean_ctor_get(v_head_1109_, 0);
lean_inc(v_fields_1112_);
lean_dec_ref_known(v_head_1109_, 1);
v_tail_1113_ = lean_ctor_get(v_tail_1110_, 1);
lean_inc(v_tail_1113_);
lean_dec_ref_known(v_tail_1110_, 2);
v_value_1114_ = lean_ctor_get(v_head_1111_, 0);
lean_inc(v_value_1114_);
lean_dec_ref_known(v_head_1111_, 1);
v___x_1115_ = lean_apply_3(v_h__1_1107_, v_fields_1112_, v_value_1114_, v_tail_1113_);
return v___x_1115_;
}
else
{
lean_object* v___x_1116_; 
lean_dec(v_h__1_1107_);
v___x_1116_ = lean_apply_2(v_h__2_1108_, v_stack_1106_, lean_box(0));
return v___x_1116_;
}
}
else
{
lean_object* v___x_1117_; 
lean_dec(v_h__1_1107_);
v___x_1117_ = lean_apply_2(v_h__2_1108_, v_stack_1106_, lean_box(0));
return v___x_1117_;
}
}
else
{
lean_object* v___x_1118_; 
lean_dec(v_h__1_1107_);
v___x_1118_ = lean_apply_2(v_h__2_1108_, v_stack_1106_, lean_box(0));
return v___x_1118_;
}
}
else
{
lean_object* v___x_1119_; 
lean_dec(v_h__1_1107_);
v___x_1119_ = lean_apply_2(v_h__2_1108_, v_stack_1106_, lean_box(0));
return v___x_1119_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__11_splitter___redArg(lean_object* v_stack_1120_, lean_object* v_h__1_1121_, lean_object* v_h__2_1122_){
_start:
{
if (lean_obj_tag(v_stack_1120_) == 1)
{
lean_object* v_head_1123_; 
v_head_1123_ = lean_ctor_get(v_stack_1120_, 0);
if (lean_obj_tag(v_head_1123_) == 2)
{
lean_object* v_tail_1124_; lean_object* v_fields_1125_; lean_object* v___x_1126_; 
lean_inc_ref(v_head_1123_);
lean_dec(v_h__2_1122_);
v_tail_1124_ = lean_ctor_get(v_stack_1120_, 1);
lean_inc(v_tail_1124_);
lean_dec_ref_known(v_stack_1120_, 2);
v_fields_1125_ = lean_ctor_get(v_head_1123_, 0);
lean_inc(v_fields_1125_);
lean_dec_ref_known(v_head_1123_, 1);
v___x_1126_ = lean_apply_2(v_h__1_1121_, v_fields_1125_, v_tail_1124_);
return v___x_1126_;
}
else
{
lean_object* v___x_1127_; 
lean_dec(v_h__1_1121_);
v___x_1127_ = lean_apply_2(v_h__2_1122_, v_stack_1120_, lean_box(0));
return v___x_1127_;
}
}
else
{
lean_object* v___x_1128_; 
lean_dec(v_h__1_1121_);
v___x_1128_ = lean_apply_2(v_h__2_1122_, v_stack_1120_, lean_box(0));
return v___x_1128_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Json_0__Algal_Core_Json_step_match__11_splitter(lean_object* v_motive_1129_, lean_object* v_stack_1130_, lean_object* v_h__1_1131_, lean_object* v_h__2_1132_){
_start:
{
if (lean_obj_tag(v_stack_1130_) == 1)
{
lean_object* v_head_1133_; 
v_head_1133_ = lean_ctor_get(v_stack_1130_, 0);
if (lean_obj_tag(v_head_1133_) == 2)
{
lean_object* v_tail_1134_; lean_object* v_fields_1135_; lean_object* v___x_1136_; 
lean_inc_ref(v_head_1133_);
lean_dec(v_h__2_1132_);
v_tail_1134_ = lean_ctor_get(v_stack_1130_, 1);
lean_inc(v_tail_1134_);
lean_dec_ref_known(v_stack_1130_, 2);
v_fields_1135_ = lean_ctor_get(v_head_1133_, 0);
lean_inc(v_fields_1135_);
lean_dec_ref_known(v_head_1133_, 1);
v___x_1136_ = lean_apply_2(v_h__1_1131_, v_fields_1135_, v_tail_1134_);
return v___x_1136_;
}
else
{
lean_object* v___x_1137_; 
lean_dec(v_h__1_1131_);
v___x_1137_ = lean_apply_2(v_h__2_1132_, v_stack_1130_, lean_box(0));
return v___x_1137_;
}
}
else
{
lean_object* v___x_1138_; 
lean_dec(v_h__1_1131_);
v___x_1138_ = lean_apply_2(v_h__2_1132_, v_stack_1130_, lean_box(0));
return v___x_1138_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Json_decode(lean_object* v_tokens_1141_){
_start:
{
lean_object* v___x_1142_; lean_object* v___x_1143_; 
v___x_1142_ = ((lean_object*)(lp_algalVerification_Algal_Core_Json_decode___closed__0));
v___x_1143_ = lp_algalVerification_List_foldl___at___00Algal_Core_Json_execute_spec__0(v___x_1142_, v_tokens_1141_);
if (lean_obj_tag(v___x_1143_) == 1)
{
lean_object* v_val_1144_; lean_object* v___x_1146_; uint8_t v_isShared_1147_; uint8_t v_isSharedCheck_1157_; 
v_val_1144_ = lean_ctor_get(v___x_1143_, 0);
v_isSharedCheck_1157_ = !lean_is_exclusive(v___x_1143_);
if (v_isSharedCheck_1157_ == 0)
{
v___x_1146_ = v___x_1143_;
v_isShared_1147_ = v_isSharedCheck_1157_;
goto v_resetjp_1145_;
}
else
{
lean_inc(v_val_1144_);
lean_dec(v___x_1143_);
v___x_1146_ = lean_box(0);
v_isShared_1147_ = v_isSharedCheck_1157_;
goto v_resetjp_1145_;
}
v_resetjp_1145_:
{
if (lean_obj_tag(v_val_1144_) == 1)
{
lean_object* v_head_1148_; 
v_head_1148_ = lean_ctor_get(v_val_1144_, 0);
lean_inc(v_head_1148_);
if (lean_obj_tag(v_head_1148_) == 0)
{
lean_object* v_tail_1149_; 
v_tail_1149_ = lean_ctor_get(v_val_1144_, 1);
lean_inc(v_tail_1149_);
lean_dec_ref_known(v_val_1144_, 2);
if (lean_obj_tag(v_tail_1149_) == 0)
{
lean_object* v_value_1150_; lean_object* v___x_1152_; 
v_value_1150_ = lean_ctor_get(v_head_1148_, 0);
lean_inc(v_value_1150_);
lean_dec_ref_known(v_head_1148_, 1);
if (v_isShared_1147_ == 0)
{
lean_ctor_set(v___x_1146_, 0, v_value_1150_);
v___x_1152_ = v___x_1146_;
goto v_reusejp_1151_;
}
else
{
lean_object* v_reuseFailAlloc_1153_; 
v_reuseFailAlloc_1153_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_1153_, 0, v_value_1150_);
v___x_1152_ = v_reuseFailAlloc_1153_;
goto v_reusejp_1151_;
}
v_reusejp_1151_:
{
return v___x_1152_;
}
}
else
{
lean_object* v___x_1154_; 
lean_dec(v_tail_1149_);
lean_dec_ref_known(v_head_1148_, 1);
lean_del_object(v___x_1146_);
v___x_1154_ = lean_box(0);
return v___x_1154_;
}
}
else
{
lean_object* v___x_1155_; 
lean_dec_ref_known(v_val_1144_, 2);
lean_dec(v_head_1148_);
lean_del_object(v___x_1146_);
v___x_1155_ = lean_box(0);
return v___x_1155_;
}
}
else
{
lean_object* v___x_1156_; 
lean_del_object(v___x_1146_);
lean_dec(v_val_1144_);
v___x_1156_ = lean_box(0);
return v___x_1156_;
}
}
}
else
{
lean_object* v___x_1158_; 
lean_dec(v___x_1143_);
v___x_1158_ = lean_box(0);
return v___x_1158_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Binary64(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_OwnMap(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Text(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_Json(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_OwnMap(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_Text(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
